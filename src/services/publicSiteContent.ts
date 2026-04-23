import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Public-read-only client for CMS content.
 *
 * Why this exists:
 * - The main app client persists auth in localStorage.
 * - Safari can hold onto a stale/invalid session token and attach it to
 *   otherwise public reads, which turns anon-safe content requests into
 *   401s before RLS can fall back to anonymous access.
 * - This client never reads or persists browser auth state, so public
 *   site content always loads as a clean anonymous visitor.
 */
const publicContentClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export type PublicSiteContentRow = {
  content: unknown;
  draft_content: unknown | null;
  updated_at?: string | null;
} | null;

export const fetchPublicSiteContentRow = async (sectionKey: string): Promise<PublicSiteContentRow> => {
  const { data, error } = await publicContentClient
    .from("site_content_public")
    .select("content, draft_content, updated_at")
    .eq("section_key", sectionKey)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const fetchPublicSiteContentValue = async <T = unknown>(sectionKey: string): Promise<T | null> => {
  const row = await fetchPublicSiteContentRow(sectionKey);
  return (row?.content as T) ?? null;
};
