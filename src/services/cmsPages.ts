/**
 * CMS Pages service — `cms_pages` table CRUD.
 *
 * CMS pages are the user-created custom pages (e.g. /p/about). Each page has
 * `page_rows` (live) and `draft_page_rows` (editor working copy), mirroring
 * the site_content draft/publish lifecycle.
 *
 * All functions return raw Supabase responses — wrap them in
 * {@link runDbAction} for toasts + loading state.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import type { PageRow } from "@/types/rows";

/** Strict aliases for the generated `cms_pages` row shapes. */
type CmsPageRow = Database["public"]["Tables"]["cms_pages"]["Row"];
type CmsPageInsert = Database["public"]["Tables"]["cms_pages"]["Insert"];
type CmsPageUpdate = Database["public"]["Tables"]["cms_pages"]["Update"];

/**
 * The `page_rows` / `draft_page_rows` columns are typed as `Json` in the
 * generated DB types because Postgres `jsonb` is structurally opaque.
 * `PageRow[]` is the application-level shape we serialise into those
 * columns, so this single helper performs the one unavoidable widening
 * (via `unknown`) at the boundary — every call site stays strict.
 */
const rowsToJson = (rows: PageRow[]): Json => rows as unknown as Json;

/**
 * Public-facing CMS page record. Mirrors the generated DB row but
 * narrows `page_rows` / `draft_page_rows` to the application's
 * `PageRow[]` shape so consumers don't have to widen `Json` themselves.
 */
export interface CmsPage extends Omit<CmsPageRow, "page_rows" | "draft_page_rows"> {
  page_rows: PageRow[];
  draft_page_rows: PageRow[] | null;
}

export const fetchAllCmsPages = () =>
  supabase.from("cms_pages").select("*").order("created_at", { ascending: false });

export const fetchPublishedCmsPageRefs = () =>
  supabase.from("cms_pages").select("slug, title").eq("status", "published");

export const fetchCmsPageById = (id: string) =>
  supabase.from("cms_pages").select("*").eq("id", id).maybeSingle();

export const createCmsPage = (title: string, slug: string) => {
  const insert: CmsPageInsert = {
    title,
    slug,
    template_type: "blank",
    page_rows: rowsToJson([]),
    status: "draft",
  };
  return supabase.from("cms_pages").insert(insert);
};

export const deleteCmsPage = (id: string) =>
  supabase.from("cms_pages").delete().eq("id", id);

export const saveCmsPageDraft = (id: string, rows: PageRow[]) => {
  const update: CmsPageUpdate = { draft_page_rows: rowsToJson(rows) };
  return supabase.from("cms_pages").update(update).eq("id", id);
};

export const publishCmsPage = (id: string, rows: PageRow[]) => {
  const update: CmsPageUpdate = {
    page_rows: rowsToJson(rows),
    draft_page_rows: rowsToJson(rows),
    status: "published",
  };
  return supabase.from("cms_pages").update(update).eq("id", id);
};

export const togglePublishCmsPage = (id: string, newStatus: "published" | "draft") => {
  const update: CmsPageUpdate = { status: newStatus };
  return supabase.from("cms_pages").update(update).eq("id", id);
};

export const updateCmsPageMeta = (
  id: string,
  field: "meta_title" | "meta_description" | "ai_summary",
  value: string,
) => {
  const update: CmsPageUpdate = { [field]: value };
  return supabase.from("cms_pages").update(update).eq("id", id);
};

export const saveCmsPageRows = (id: string, rows: PageRow[]) => {
  const update: CmsPageUpdate = {
    page_rows: rowsToJson(rows),
    draft_page_rows: rowsToJson(rows),
  };
  return supabase.from("cms_pages").update(update).eq("id", id);
};

/** Slugs reserved by the system — block users from claiming them. */
export const RESERVED_SLUGS = ["admin", "blog", "unsubscribe", "api", "auth", "login", "signup", "p"];

/**
 * Duplicate a CMS page. The clone:
 *   • copies title + rows + meta from the source,
 *   • appends " (Copy)" to the title,
 *   • derives a unique slug by suffixing `-copy`, then `-copy-2`, etc.
 *     until it clears existing slugs AND the reserved list,
 *   • starts as a draft so duplicating never accidentally publishes a
 *     half-finished page to the live site.
 *
 * Returns the inserted row (so the caller can navigate or refresh).
 */
export const duplicateCmsPage = async (sourceId: string) => {
  const { data: src, error: fetchErr } = await supabase
    .from("cms_pages")
    .select("*")
    .eq("id", sourceId)
    .maybeSingle();
  if (fetchErr) return { data: null, error: fetchErr };
  if (!src) return { data: null, error: { message: "Source page not found" } };

  const { data: existing } = await supabase.from("cms_pages").select("slug");
  const taken = new Set([
    ...RESERVED_SLUGS,
    ...((existing ?? []).map((p) => p.slug)),
  ]);

  // Find the first free `-copy[-N]` suffix.
  const baseSlug = `${src.slug}-copy`;
  let candidate = baseSlug;
  let n = 2;
  while (taken.has(candidate)) {
    candidate = `${baseSlug}-${n}`;
    n += 1;
  }

  const insert: CmsPageInsert = {
    title: `${src.title} (Copy)`,
    slug: candidate,
    template_type: src.template_type,
    page_rows: src.page_rows ?? rowsToJson([]),
    draft_page_rows: src.draft_page_rows ?? src.page_rows ?? rowsToJson([]),
    status: "draft",
    meta_title: src.meta_title,
    meta_description: src.meta_description,
    ai_summary: src.ai_summary,
  };
  return supabase.from("cms_pages").insert(insert).select().maybeSingle();
};
