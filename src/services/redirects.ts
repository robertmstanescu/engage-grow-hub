/**
 * Redirects service — `redirects` table CRUD.
 *
 * A redirect maps an old public path to a new target so renaming or
 * deleting a CMS page / blog post never silently 404s a live URL (see
 * `useRedirectLookup` for the public-side interception, and
 * `CmsPageBuilder`/`BlogPostBuilder`/`PagesManager`/`BlogEditor` for the
 * auto-creation call sites on rename/delete).
 *
 * All functions return raw Supabase responses — wrap them in
 * {@link runDbAction} for toasts + loading state, or use the
 * `useRedirects` react-query hook for the admin UI.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { normalizePath } from "@/lib/redirectPaths";

export type Redirect = Database["public"]["Tables"]["redirects"]["Row"];

export const fetchAllRedirects = () =>
  supabase.from("redirects").select("*").order("created_at", { ascending: false });

export const lookupRedirect = (pathname: string) =>
  supabase
    .from("redirects")
    .select("to_path, status_code")
    .eq("from_path", normalizePath(pathname))
    .maybeSingle();

/**
 * Create (or update, if `from_path` already has a row) a redirect.
 * `upsert` on the `from_path` unique constraint deliberately absorbs the
 * case where a slug bounces `a → b → a` across two edits — the second
 * rename just repoints the existing `a → ?` row instead of erroring on
 * the unique constraint or leaving a stale duplicate.
 *
 * Silently no-ops on a self-redirect (`from === to`) — that would only
 * ever be a bug upstream, never a real intent.
 */
export const createRedirect = (
  fromPath: string,
  toPath: string,
  source: "auto" | "manual" = "manual",
) => {
  const from_path = normalizePath(fromPath);
  const to_path = normalizePath(toPath);
  if (from_path === to_path) return Promise.resolve({ data: null, error: null });
  return supabase
    .from("redirects")
    .upsert({ from_path, to_path, source }, { onConflict: "from_path" });
};

export const deleteRedirect = (id: string) => supabase.from("redirects").delete().eq("id", id);
