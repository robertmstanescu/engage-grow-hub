/**
 * Page Revisions service — unified versioning across site_content,
 * cms_pages and blog_posts.
 *
 * Snapshots are written automatically by Postgres triggers whenever
 * the LIVE column of an entity changes (i.e. when an editor publishes).
 * This service only reads + restores them.
 *
 * Restore copies the snapshot back into the entity's *draft* (never
 * directly into the live column) so editors can review before clicking
 * Publish to make the rollback go live.
 */
import { supabase } from "@/integrations/supabase/client";

export type RevisionEntityType = "site_content" | "cms_page" | "blog_post";

export interface PageRevision {
  id: string;
  entity_type: RevisionEntityType;
  entity_ref: string;
  version: number;
  content: any;
  label: string | null;
  created_at: string;
  created_by: string | null;
}

/** Author display name lookup. */
export interface PageRevisionWithAuthor extends PageRevision {
  author_display_name: string | null;
}

/** All revisions for one entity, newest first. */
export async function listRevisions(
  entity_type: RevisionEntityType,
  entity_ref: string,
) {
  return supabase
    .from("page_revisions" as any)
    .select("id, entity_type, entity_ref, version, content, label, created_at, created_by")
    .eq("entity_type", entity_type)
    .eq("entity_ref", entity_ref)
    .order("version", { ascending: false }) as unknown as Promise<{
    data: PageRevision[] | null;
    error: any;
  }>;
}

/** Resolve display names for the authors of a revision list (one batched lookup). */
export async function attachAuthors(
  revisions: PageRevision[],
): Promise<PageRevisionWithAuthor[]> {
  const ids = Array.from(
    new Set(revisions.map((r) => r.created_by).filter(Boolean) as string[]),
  );
  if (ids.length === 0) {
    return revisions.map((r) => ({ ...r, author_display_name: null }));
  }
  const { data } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", ids);
  const map = new Map<string, string | null>();
  (data || []).forEach((p: any) => map.set(p.user_id, p.display_name));
  return revisions.map((r) => ({
    ...r,
    author_display_name: r.created_by ? map.get(r.created_by) ?? null : null,
  }));
}

/** Restore a revision into the entity's draft. */
export async function restoreRevision(revisionId: string) {
  return supabase.rpc("restore_page_revision" as any, { _revision_id: revisionId });
}

/** Aggregate counts grouped by entity, used for the global history dashboard. */
export async function listAllEntitiesWithCounts() {
  const { data, error } = await supabase
    .from("page_revisions" as any)
    .select("entity_type, entity_ref, version")
    .order("entity_type");
  if (error || !data) return { data: null, error };

  const map = new Map<
    string,
    { entity_type: RevisionEntityType; entity_ref: string; latest: number; count: number }
  >();
  for (const row of (data as unknown as Array<{
    entity_type: RevisionEntityType;
    entity_ref: string;
    version: number;
  }>) || []) {
    const key = `${row.entity_type}:${row.entity_ref}`;
    const cur =
      map.get(key) || { entity_type: row.entity_type, entity_ref: row.entity_ref, latest: 0, count: 0 };
    cur.count += 1;
    if (row.version > cur.latest) cur.latest = row.version;
    map.set(key, cur);
  }
  return { data: Array.from(map.values()), error: null };
}

/**
 * Resolve a friendly display label for an entity (e.g. CMS page slug,
 * blog post title) so the global history page is human-readable.
 */
export async function resolveEntityLabels(
  entries: { entity_type: RevisionEntityType; entity_ref: string }[],
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const cmsIds = entries.filter((e) => e.entity_type === "cms_page").map((e) => e.entity_ref);
  const blogIds = entries.filter((e) => e.entity_type === "blog_post").map((e) => e.entity_ref);

  if (cmsIds.length) {
    const { data } = await supabase.from("cms_pages").select("id, title, slug").in("id", cmsIds);
    (data || []).forEach((p: any) =>
      (out[`cms_page:${p.id}`] = p.title || `/${p.slug}`),
    );
  }
  if (blogIds.length) {
    const { data } = await supabase.from("blog_posts").select("id, title, slug").in("id", blogIds);
    (data || []).forEach((p: any) =>
      (out[`blog_post:${p.id}`] = p.title || `/blog/${p.slug}`),
    );
  }
  for (const e of entries) {
    const k = `${e.entity_type}:${e.entity_ref}`;
    if (!out[k]) out[k] = e.entity_ref;
  }
  return out;
}
