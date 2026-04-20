/**
 * Site Content Versions — the version-history backup layer.
 *
 * Every Publish on `site_content` automatically writes a snapshot row
 * via the `trg_snapshot_site_content_version` trigger. This service
 * lets the admin UI list + restore those snapshots.
 *
 * Restore copies the chosen version into `draft_content` (NOT directly
 * into `content`) so the admin can review in the editor and then click
 * Publish — preventing accidental rollbacks from going live instantly.
 */
import { supabase } from "@/integrations/supabase/client";

export interface SiteContentVersion {
  id: string;
  section_key: string;
  version: number;
  content: Record<string, any>;
  label: string | null;
  created_at: string;
  created_by: string | null;
}

/** All snapshots for a section, newest first. */
export async function listVersions(sectionKey: string) {
  return supabase
    .from("site_content_versions" as any)
    .select("id, section_key, version, content, label, created_at, created_by")
    .eq("section_key", sectionKey)
    .order("version", { ascending: false }) as unknown as Promise<{
    data: SiteContentVersion[] | null;
    error: any;
  }>;
}

/**
 * Restore a version into the section's draft. Calls the SECURITY
 * DEFINER RPC so RLS + admin check happen server-side.
 */
export async function restoreVersion(sectionKey: string, version: number) {
  return supabase.rpc("restore_site_content_version" as any, {
    _section_key: sectionKey,
    _version: version,
  });
}

/** Counts of versions per section_key — used for the dashboard summary. */
export async function listAllSectionsWithCounts() {
  const { data, error } = await supabase
    .from("site_content_versions" as any)
    .select("section_key, version")
    .order("section_key");
  if (error || !data) return { data: null, error };

  const map = new Map<string, { latest: number; count: number }>();
  for (const row of (data as unknown as Array<{ section_key: string; version: number }>) || []) {
    const cur = map.get(row.section_key) || { latest: 0, count: 0 };
    cur.count += 1;
    if (row.version > cur.latest) cur.latest = row.version;
    map.set(row.section_key, cur);
  }
  return {
    data: Array.from(map.entries()).map(([section_key, v]) => ({ section_key, ...v })),
    error: null,
  };
}
