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
import type { PageRow } from "@/types/rows";

export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  template_type: string;
  page_rows: PageRow[];
  draft_page_rows: PageRow[] | null;
  status: string;
  created_at: string;
  /** Last edited timestamp — surfaced in the Pages table view (US 3.2). */
  updated_at: string;
  meta_title?: string;
  meta_description?: string;
  ai_summary?: string;
}

export const fetchAllCmsPages = () =>
  supabase.from("cms_pages").select("*").order("created_at", { ascending: false });

export const fetchPublishedCmsPageRefs = () =>
  supabase.from("cms_pages").select("slug, title").eq("status", "published");

export const fetchCmsPageById = (id: string) =>
  supabase.from("cms_pages").select("*").eq("id", id).maybeSingle();

export const createCmsPage = (title: string, slug: string) =>
  supabase.from("cms_pages").insert({
    title,
    slug,
    template_type: "blank",
    page_rows: [],
    status: "draft",
  } as any);

export const deleteCmsPage = (id: string) =>
  supabase.from("cms_pages").delete().eq("id", id);

export const saveCmsPageDraft = (id: string, rows: PageRow[]) =>
  supabase.from("cms_pages").update({ draft_page_rows: rows as any } as any).eq("id", id);

export const publishCmsPage = (id: string, rows: PageRow[]) =>
  supabase
    .from("cms_pages")
    .update({
      page_rows: rows as any,
      draft_page_rows: rows as any,
      status: "published",
    } as any)
    .eq("id", id);

export const togglePublishCmsPage = (id: string, newStatus: "published" | "draft") =>
  supabase.from("cms_pages").update({ status: newStatus } as any).eq("id", id);

export const updateCmsPageMeta = (id: string, field: "meta_title" | "meta_description" | "ai_summary", value: string) =>
  supabase.from("cms_pages").update({ [field]: value } as any).eq("id", id);

export const saveCmsPageRows = (id: string, rows: PageRow[]) =>
  supabase
    .from("cms_pages")
    .update({ page_rows: rows as any, draft_page_rows: rows as any } as any)
    .eq("id", id);

/** Slugs reserved by the system — block users from claiming them. */
export const RESERVED_SLUGS = ["admin", "blog", "unsubscribe", "api", "auth", "login", "signup", "p"];

/**
 * Duplicate a CMS page (US 3.2). The clone:
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
  if (!src) return { data: null, error: { message: "Source page not found" } as any };

  const { data: existing } = await supabase.from("cms_pages").select("slug");
  const taken = new Set([
    ...RESERVED_SLUGS,
    ...((existing as { slug: string }[] | null) || []).map((p) => p.slug),
  ]);

  // Find the first free `-copy[-N]` suffix.
  const baseSlug = `${src.slug}-copy`;
  let candidate = baseSlug;
  let n = 2;
  while (taken.has(candidate)) {
    candidate = `${baseSlug}-${n}`;
    n += 1;
  }

  return supabase.from("cms_pages").insert({
    title: `${src.title} (Copy)`,
    slug: candidate,
    template_type: src.template_type,
    page_rows: src.page_rows ?? [],
    draft_page_rows: src.draft_page_rows ?? src.page_rows ?? [],
    status: "draft",
    meta_title: src.meta_title,
    meta_description: src.meta_description,
    ai_summary: src.ai_summary,
  } as any).select().maybeSingle();
};
