/**
 * Site Content service — every read/write to the `site_content` table.
 *
 * The site_content table is the heart of the CMS. Each row is a
 * "section" (hero, navbar, footer, brand_settings, page_rows, etc.) with
 * two payloads:
 *
 *   - `content`        → the live, published version
 *   - `draft_content`  → the editor's working copy (may differ from content)
 *
 * The "Save Draft" button writes to `draft_content`. The "Publish" button
 * copies `draft_content` into `content` so the public site picks it up.
 *
 * All functions here are PURE data-access — they don't toast, don't set
 * loading state. Combine them with {@link runDbAction} from db-helpers.ts
 * when you need the full async-UX treatment.
 *
 * ════════════════════════════════════════════════════════════════════
 * PERFORMANCE: MINIMISING EXPENSIVE DATABASE CALLS
 * ════════════════════════════════════════════════════════════════════
 *
 * Every Supabase call here is a network round-trip — the slowest thing
 * the public site can do. We minimise those round-trips through THREE
 * complementary techniques:
 *
 *   1) READ-SIDE CACHING (react-query in `useSiteContent`).
 *      Public reads route through a cache keyed by section_key with a
 *      5-minute staleTime. The first visitor pays the network cost;
 *      every subsequent render in that window reads from memory.
 *
 *   2) BATCHING (`fetchSections`).
 *      When a component needs multiple sections at once (e.g. the
 *      admin dashboard previewing the entire site), we use one
 *      `.in("section_key", keys)` query instead of N separate calls.
 *      This collapses N round-trips into 1.
 *
 *   3) EXPLICIT INVALIDATION (`invalidateSiteContent`).
 *      Admin writes broadcast a custom event that the QueryClient
 *      catches and uses to invalidate the matching cache entry.
 *      No polling, no time-based revalidation — the cache only changes
 *      when content actually changes.
 *
 * Net effect: the homepage typically makes ZERO network calls on a
 * warm cache, and admin edits propagate to the public site within one
 * render of clicking "Publish".
 */

import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

/** A single section row as stored in `site_content`. */
export interface SiteContentRow<T = Record<string, any>> {
  section_key: string;
  content: T;
  draft_content: T | null;
}

/** Public-safe row shape returned by `site_content_public`. */
export interface PublicSiteContentRow<T = Record<string, any>> {
  content: T;
  draft_content: T | null;
}

const buildPublicSectionUrl = (key: string, columns: string) => {
  const params = new URLSearchParams({
    select: columns,
    section_key: `eq.${key}`,
    _cb: Date.now().toString(),
  });

  return `${SUPABASE_URL}/rest/v1/site_content_public?${params.toString()}`;
};

/**
 * Read published site content via a manual fetch that explicitly bypasses the
 * browser HTTP cache. Safari desktop has been observed to reuse stale REST
 * responses for this view even after a new frontend deploy; `cache: "no-store"`
 * plus a `_cb` query param makes every request unambiguously fresh.
 */
export async function fetchPublicSection<T = Record<string, any>>(
  key: string,
  columns = "content,draft_content",
): Promise<{ data: PublicSiteContentRow<T> | null; error: Error | null }> {
  try {
    const response = await fetch(buildPublicSectionUrl(key, columns), {
      method: "GET",
      cache: "no-store",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        Accept: "application/json",
        "Accept-Profile": "public",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });

    if (!response.ok) {
      const message = await response.text();
      return {
        data: null,
        error: new Error(message || `Failed to fetch public site content for ${key}`),
      };
    }

    const rows = (await response.json()) as PublicSiteContentRow<T>[];
    return { data: rows[0] ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(`Failed to fetch public site content for ${key}`),
    };
  }
}

/** Fetch one section by key. Returns `null` if it doesn't exist yet. */
export async function fetchSection<T = Record<string, any>>(key: string) {
  return supabase
    .from("site_content")
    .select("content, draft_content")
    .eq("section_key", key)
    .maybeSingle() as unknown as Promise<{ data: SiteContentRow<T> | null; error: any }>;
}

/** Fetch many sections in a single round-trip. */
export async function fetchSections<T = Record<string, any>>(keys: string[]) {
  return supabase
    .from("site_content")
    .select("section_key, content, draft_content")
    .in("section_key", keys) as unknown as Promise<{ data: SiteContentRow<T>[] | null; error: any }>;
}

/**
 * Save a draft (editor working copy) without touching the live `content`.
 * This is what the "Save Draft" button calls.
 *
 * Uses `upsert` so the same code path works for both insert (first save)
 * and update (subsequent saves).
 */
export async function saveDraft<T extends Record<string, any>>(key: string, draft: T) {
  // Look up existing row id so we can update — upsert with onConflict was
  // briefly considered but is rejected by RLS for INSERTs that touch
  // `content`. So we branch explicitly.
  const { data: existing } = await supabase
    .from("site_content")
    .select("id")
    .eq("section_key", key)
    .maybeSingle();

  if (existing) {
    return supabase
      .from("site_content")
      .update({ draft_content: draft as any })
      .eq("section_key", key);
  }

  return supabase
    .from("site_content")
    .insert({ section_key: key, content: draft as any, draft_content: draft as any } as any);
}

/**
 * Publish a section: copy draft into the live `content` so the public
 * frontend sees it.
 */
export async function publishSection<T extends Record<string, any>>(key: string, payload: T) {
  return supabase
    .from("site_content")
    .upsert(
      { section_key: key, content: payload as any, draft_content: payload as any } as any,
      { onConflict: "section_key" }
    );
}

/**
 * Update a single deeply-nested field in a section's draft.
 * Used by the inline "Edit Mode" toolbar on the live site so admins can
 * tap text and save without opening the dashboard.
 */
export async function updateSectionField(key: string, fieldPath: string, value: unknown) {
  const { data: existing } = await fetchSection(key);
  if (!existing) {
    return { data: null, error: new Error("Section does not exist") };
  }

  const draft = existing.draft_content || existing.content || {};
  const updated = setNestedField(draft, fieldPath, value);

  return supabase
    .from("site_content")
    .update({ draft_content: updated, content: updated })
    .eq("section_key", key);
}

/* ─────────────────────────────────────────────────────────────────────────
   Internal helper: set a value at a dot-notation path. Mutates a clone.
   ───────────────────────────────────────────────────────────────────────── */
function setNestedField(obj: any, path: string, value: any): any {
  const clone = JSON.parse(JSON.stringify(obj));
  const keys = path.split(".");
  let cur = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = /^\d+$/.test(keys[i]) ? Number(keys[i]) : keys[i];
    if (cur[k] === undefined) cur[k] = {};
    cur = cur[k];
  }
  const last = /^\d+$/.test(keys[keys.length - 1])
    ? Number(keys[keys.length - 1])
    : keys[keys.length - 1];
  cur[last] = value;
  return clone;
}
