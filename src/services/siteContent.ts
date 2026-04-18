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
 */

import { supabase } from "@/integrations/supabase/client";

/** A single section row as stored in `site_content`. */
export interface SiteContentRow<T = Record<string, any>> {
  section_key: string;
  content: T;
  draft_content: T | null;
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
