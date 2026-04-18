/**
 * Storage service — every interaction with Supabase Storage buckets.
 *
 * Wraps `editor-images` (general media + branding + blog covers) and
 * `row-overlays` (per-row visual elements). All upload helpers return
 * BOTH the upload result and the resulting public URL so callers don't
 * have to make a second round-trip.
 */

import { supabase } from "@/integrations/supabase/client";

const EDITOR_BUCKET = "editor-images";
const OVERLAY_BUCKET = "row-overlays";

interface UploadResult {
  publicUrl: string | null;
  error: any;
}

/** Generate a collision-resistant filename within a folder. */
const makePath = (folder: string, file: File) => {
  const ext = file.name.split(".").pop() || "bin";
  return `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
};

/* ─────────────────────────────────────────────────────────────────────────
   editor-images bucket
   ───────────────────────────────────────────────────────────────────────── */

/** Upload to a known folder under editor-images. */
export async function uploadEditorImage(folder: string, file: File): Promise<UploadResult> {
  const path = makePath(folder, file);
  const { error } = await supabase.storage.from(EDITOR_BUCKET).upload(path, file);
  if (error) return { publicUrl: null, error };
  const { data: { publicUrl } } = supabase.storage.from(EDITOR_BUCKET).getPublicUrl(path);
  return { publicUrl, error: null };
}

/** Upsert a branding asset at a deterministic path so it can be replaced cleanly. */
export async function uploadBrandingAsset(field: string, file: File): Promise<UploadResult> {
  const ext = file.name.split(".").pop() || "png";
  const path = `branding/${field}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(EDITOR_BUCKET).upload(path, file, { upsert: true });
  if (error) return { publicUrl: null, error };
  const { data: { publicUrl } } = supabase.storage.from(EDITOR_BUCKET).getPublicUrl(path);
  return { publicUrl, error: null };
}

export const listEditorImages = (folder = "", limit = 200) =>
  supabase.storage.from(EDITOR_BUCKET).list(folder, {
    limit,
    sortBy: { column: "created_at", order: "desc" },
  });

export const getEditorPublicUrl = (path: string) =>
  supabase.storage.from(EDITOR_BUCKET).getPublicUrl(path).data.publicUrl;

export const removeEditorImages = (paths: string[]) =>
  supabase.storage.from(EDITOR_BUCKET).remove(paths);

export const downloadEditorImage = (path: string) =>
  supabase.storage.from(EDITOR_BUCKET).download(path);

export const uploadEditorImageRaw = (path: string, blob: Blob) =>
  supabase.storage.from(EDITOR_BUCKET).upload(path, blob);

/**
 * Rename a file in the editor-images bucket.
 *
 * Supabase Storage has no native `rename` — we copy the file to its new
 * path and remove the old one. Wrapped here so callers don't have to know
 * about the two-step dance (and so we can swap to a single API later if
 * Supabase ever adds one).
 */
export async function renameEditorImage(oldPath: string, newPath: string) {
  const { data: blob, error: dlErr } = await supabase.storage.from(EDITOR_BUCKET).download(oldPath);
  if (dlErr || !blob) return { error: dlErr ?? new Error("Failed to read file") };
  const { error: upErr } = await supabase.storage.from(EDITOR_BUCKET).upload(newPath, blob);
  if (upErr) return { error: upErr };
  await supabase.storage.from(EDITOR_BUCKET).remove([oldPath]);
  return { error: null };
}

/* ─────────────────────────────────────────────────────────────────────────
   row-overlays bucket
   ───────────────────────────────────────────────────────────────────────── */

export async function uploadRowOverlay(file: File): Promise<UploadResult> {
  const ext = file.name.split(".").pop() || "png";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(OVERLAY_BUCKET).upload(path, file);
  if (error) return { publicUrl: null, error };
  const { data: { publicUrl } } = supabase.storage.from(OVERLAY_BUCKET).getPublicUrl(path);
  return { publicUrl, error: null };
}
