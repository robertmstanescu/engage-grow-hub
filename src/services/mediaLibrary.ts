/**
 * Media Library service — folders + assets + uploads for the new
 * `media-library` Supabase Storage bucket and the `media_assets` /
 * `media_folders` tables.
 *
 * This is the canonical entry point used by:
 *   - the rebuilt MediaGallery admin tab,
 *   - the BlogEditor "Lead Magnet" dual-upload, and
 *   - the Page Builder LeadMagnet row editor.
 *
 * Why a service file instead of inline supabase calls?
 *   1. Components stay small and declarative — no `supabase.from(...)`
 *      bleeding into JSX.
 *   2. Upload progress needs an XHR (the Supabase JS SDK does not expose
 *      progress events as of writing), so we build the URL + headers in
 *      one place and reuse them.
 *   3. Type definitions live next to the queries that produce them.
 */

import { supabase } from "@/integrations/supabase/client";

const BUCKET = "media-library";

/* ─────────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────────── */

export interface MediaFolder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

export interface MediaAsset {
  id: string;
  storage_path: string;
  bucket: string;
  mime_type: string | null;
  size_bytes: number | null;
  title: string;
  description: string;
  alt_text: string;
  seo_metadata: Record<string, unknown>;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Status payload reported by {@link uploadAssetWithProgress}. */
export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percent: number;
}

/* ─────────────────────────────────────────────────────────────────
   Folder CRUD
   ───────────────────────────────────────────────────────────────── */

export const fetchAllFolders = () =>
  supabase
    .from("media_folders")
    .select("*")
    .order("name", { ascending: true });

export const insertFolder = (name: string, parentId: string | null) =>
  supabase
    .from("media_folders")
    .insert({ name, parent_id: parentId })
    .select()
    .single();

export const renameFolder = (id: string, name: string) =>
  supabase.from("media_folders").update({ name }).eq("id", id);

export const deleteFolder = (id: string) =>
  supabase.from("media_folders").delete().eq("id", id);

/* ─────────────────────────────────────────────────────────────────
   Asset CRUD
   ───────────────────────────────────────────────────────────────── */

export const fetchAllAssets = () =>
  supabase
    .from("media_assets")
    .select("*")
    .order("created_at", { ascending: false });

export const fetchAssetById = (id: string) =>
  supabase.from("media_assets").select("*").eq("id", id).maybeSingle();

export const updateAssetMetadata = (
  id: string,
  patch: Partial<Pick<MediaAsset, "title" | "description" | "alt_text" | "folder_id">> & {
    seo_metadata?: Record<string, unknown>;
  },
) => supabase.from("media_assets").update(patch as any).eq("id", id);

export const moveAssetToFolder = (id: string, folderId: string | null) =>
  supabase.from("media_assets").update({ folder_id: folderId }).eq("id", id);

/**
 * Rename the underlying storage object (changes the visible filename in the
 * URL) AND update the matching row's `storage_path`. We MOVE inside Supabase
 * Storage rather than copy+delete because move is atomic on the server side
 * and preserves the original `created_at`/uploaded-by metadata.
 *
 * Why we expose this as a single helper:
 *   - Renaming is two operations (storage move + DB update). If we let the
 *     caller do them separately the row could end up pointing at a 404.
 *   - The new path is computed here so callers only need to think about a
 *     human-readable filename — we do the slugification + extension
 *     preservation.
 *
 * @param asset           the current MediaAsset (we need its old storage_path)
 * @param newDisplayName  user-typed filename WITHOUT extension. We re-attach
 *                        the original extension so the mime stays valid.
 */
export async function renameAssetFile(asset: MediaAsset, newDisplayName: string) {
  const trimmed = newDisplayName.trim();
  if (!trimmed) return { error: new Error("Filename cannot be empty") };

  // Preserve the original extension so the file is still served with the
  // right Content-Type. If the asset had no extension we just use the slug.
  const oldExt = asset.storage_path.includes(".")
    ? asset.storage_path.split(".").pop()
    : "";
  const safeBase = trimmed
    .replace(/\.[^.]+$/, "") // user might have typed an extension — strip it
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "file";
  const newPath = oldExt ? `${safeBase}.${oldExt}` : safeBase;

  // No-op if the path is unchanged.
  if (newPath === asset.storage_path) return { error: null };

  const { error: moveErr } = await supabase.storage
    .from(asset.bucket)
    .move(asset.storage_path, newPath);
  if (moveErr) return { error: moveErr };

  const { error: dbErr } = await supabase
    .from("media_assets")
    .update({ storage_path: newPath })
    .eq("id", asset.id);
  if (dbErr) {
    // Best-effort rollback: move the file back so the DB stays consistent.
    await supabase.storage.from(asset.bucket).move(newPath, asset.storage_path);
    return { error: dbErr };
  }
  return { error: null };
}

/* ─────────────────────────────────────────────────────────────────
   Asset usage discovery
   ─────────────────────────────────────────────────────────────────
   We let admins see WHERE an asset is referenced before they delete or
   rename it. Because rows store either the asset's `id` (lead magnets) or
   its public URL string (most images embedded in rich text / hero
   backgrounds / page rows), we have to scan both shapes.

   This is intentionally a CLIENT-SIDE scan over the JSON payload. The
   admin tables are small (dozens-to-hundreds of rows each) and a single
   `select` is much cheaper than maintaining a denormalised join table or
   a full-text index. If volumes ever grow past ~5k pages we should move
   this into a Postgres function. */
export interface AssetUsage {
  /** "blog" | "cms" | "site" — drives which icon the gallery shows. */
  source: "blog" | "cms" | "site";
  /** Human-readable label, e.g. "Blog post: My title" or "Page: /about". */
  label: string;
  /** Optional URL the admin can click to jump to the consumer. */
  href?: string;
}

/**
 * Find every blog post, CMS page, and site_content section that mentions
 * the given asset. The match is "this storage_path or asset id appears
 * anywhere in the row's serialised JSON" — that catches references inside
 * page_rows, hero backgrounds, lead-magnet pickers, etc., without needing
 * to know each row type's schema in advance.
 */
export async function findAssetUsages(asset: MediaAsset): Promise<AssetUsage[]> {
  const usages: AssetUsage[] = [];
  // Both the public URL and the bare path get embedded by various editors,
  // so we look for either.
  const url = getAssetPublicUrl(asset.storage_path);
  const matchesBlob = (blob: unknown) => {
    const text = JSON.stringify(blob ?? "");
    return (
      text.includes(asset.storage_path) ||
      text.includes(url) ||
      text.includes(asset.id)
    );
  };

  const [
    { data: blogPosts },
    { data: cmsPages },
    { data: siteContent },
  ] = await Promise.all([
    supabase.from("blog_posts").select("id, title, slug, content, cover_image, og_image, lead_magnet_asset_id, lead_magnet_cover_id"),
    supabase.from("cms_pages").select("id, title, slug, page_rows, draft_page_rows"),
    supabase.from("site_content").select("section_key, content, draft_content"),
  ]);

  (blogPosts as any[] | null)?.forEach((post) => {
    if (matchesBlob(post)) {
      usages.push({
        source: "blog",
        label: `Blog: ${post.title || post.slug}`,
        href: `/blog/${post.slug}`,
      });
    }
  });

  (cmsPages as any[] | null)?.forEach((page) => {
    if (matchesBlob(page)) {
      usages.push({
        source: "cms",
        label: `Page: ${page.title || page.slug}`,
        href: `/p/${page.slug}`,
      });
    }
  });

  (siteContent as any[] | null)?.forEach((section) => {
    if (matchesBlob(section)) {
      usages.push({
        source: "site",
        label: `Main site · ${section.section_key}`,
      });
    }
  });

  return usages;
}

/**
 * Delete the underlying storage object AND the database row.
 *
 * We delete the storage object first so the row is never left orphaned with
 * a 404'ing `storage_path`. If the storage delete fails, the row stays put
 * so the user can retry.
 */
export async function deleteAssetCompletely(asset: MediaAsset) {
  const { error: storageError } = await supabase.storage
    .from(asset.bucket)
    .remove([asset.storage_path]);
  if (storageError) return { error: storageError };
  return supabase.from("media_assets").delete().eq("id", asset.id);
}

/* ─────────────────────────────────────────────────────────────────
   URL helpers
   ───────────────────────────────────────────────────────────────── */

/**
 * Public CDN URL for a file in any of the media buckets.
 *
 * Why the optional `bucket` arg? Historically all uploads went to
 * `editor-images`. The new gallery defaults to `media-library` but we
 * backfilled the legacy bucket into `media_assets` so existing files show
 * up. Callers that have a full asset in hand should pass `asset.bucket` to
 * make sure we hit the right bucket; callers that only have a path
 * (e.g. embedded URLs in rich-text) can omit it and we fall back to the
 * default `media-library`.
 */
export const getAssetPublicUrl = (storagePath: string, bucket: string = BUCKET) =>
  supabase.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;

/* ─────────────────────────────────────────────────────────────────
   Uploads
   ───────────────────────────────────────────────────────────────── */

/** Build a collision-resistant storage path inside an optional folder. */
function buildStoragePath(file: File): string {
  const extension = file.name.split(".").pop() || "bin";
  const safeBase = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "file";
  return `${safeBase}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
}

interface UploadAssetParams {
  file: File;
  folderId: string | null;
  /** Optional metadata; defaults to file name as title and empty alt-text. */
  title?: string;
  description?: string;
  altText?: string;
  /** Called every progress event (0–100). */
  onProgress?: (event: UploadProgressEvent) => void;
}

/**
 * Upload a file to `media-library` with real-time progress events, then
 * register it in `media_assets`.
 *
 * Why XHR instead of `supabase.storage.from(...).upload(...)`?
 *   The current Supabase JS client does not surface progress events for
 *   uploads, so we POST directly to the storage REST endpoint and listen
 *   to `xhr.upload.onprogress`. The auth header carries the user's JWT so
 *   the bucket's RLS policy still gates the write to admins.
 *
 * @returns the inserted MediaAsset row, or `{ error }` on failure.
 */
export async function uploadAssetWithProgress({
  file,
  folderId,
  title,
  description,
  altText,
  onProgress,
}: UploadAssetParams): Promise<{ asset: MediaAsset | null; error: Error | null }> {
  const storagePath = buildStoragePath(file);
  const session = (await supabase.auth.getSession()).data.session;
  const accessToken = session?.access_token;
  if (!accessToken) {
    return { asset: null, error: new Error("You must be signed in to upload.") };
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${BUCKET}/${encodeURIComponent(storagePath)}`;

  const uploadError = await new Promise<Error | null>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl, true);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", apiKey);
    xhr.setRequestHeader("x-upsert", "false");
    if (file.type) xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable || !onProgress) return;
      onProgress({
        loaded: e.loaded,
        total: e.total,
        percent: Math.min(100, Math.round((e.loaded / e.total) * 100)),
      });
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress({ loaded: file.size, total: file.size, percent: 100 });
        resolve(null);
      } else {
        let message = `Upload failed (${xhr.status})`;
        try {
          const body = JSON.parse(xhr.responseText);
          if (body?.message) message = body.message;
        } catch {
          /* ignore — keep generic message */
        }
        resolve(new Error(message));
      }
    };
    xhr.onerror = () => resolve(new Error("Network error during upload"));
    xhr.send(file);
  });

  if (uploadError) return { asset: null, error: uploadError };

  // Register the asset row. We use `.select().single()` so callers receive
  // the freshly-inserted row (with its server-assigned id) without a second
  // round-trip.
  const { data, error: insertError } = await supabase
    .from("media_assets")
    .insert({
      storage_path: storagePath,
      bucket: BUCKET,
      mime_type: file.type || null,
      size_bytes: file.size,
      title: (title ?? file.name).trim(),
      description: description?.trim() ?? "",
      alt_text: altText?.trim() ?? "",
      folder_id: folderId,
    })
    .select()
    .single();

  if (insertError || !data) {
    // Roll back the storage upload so we don't leak orphaned files.
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return { asset: null, error: insertError ? new Error(insertError.message) : new Error("Failed to register asset") };
  }

  return { asset: data as MediaAsset, error: null };
}

/* ─────────────────────────────────────────────────────────────────
   Convenience: figure out whether a file is an image
   ───────────────────────────────────────────────────────────────── */
export const isImageMime = (mime: string | null) => !!mime && mime.startsWith("image/");
