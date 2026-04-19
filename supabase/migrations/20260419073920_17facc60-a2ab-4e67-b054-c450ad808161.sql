-- Backfill existing storage objects from the legacy `editor-images` bucket
-- into `media_assets` so they appear in the new Media Library admin UI
-- and participate in usage discovery + rename/delete flows.
--
-- We derive a human-readable title from the filename (sans extension) and
-- best-effort guess the mime type from the file extension. Files already
-- present in `media_assets` (matched by storage_path AND bucket) are skipped
-- so this migration is safe to re-run.

INSERT INTO public.media_assets (storage_path, bucket, mime_type, size_bytes, title, description, alt_text, folder_id, created_at, updated_at)
SELECT
  o.name AS storage_path,
  o.bucket_id AS bucket,
  CASE
    WHEN lower(o.name) ~ '\.(png)$' THEN 'image/png'
    WHEN lower(o.name) ~ '\.(jpe?g)$' THEN 'image/jpeg'
    WHEN lower(o.name) ~ '\.(gif)$' THEN 'image/gif'
    WHEN lower(o.name) ~ '\.(webp)$' THEN 'image/webp'
    WHEN lower(o.name) ~ '\.(svg)$' THEN 'image/svg+xml'
    WHEN lower(o.name) ~ '\.(pdf)$' THEN 'application/pdf'
    WHEN lower(o.name) ~ '\.(mp4)$' THEN 'video/mp4'
    WHEN lower(o.name) ~ '\.(webm)$' THEN 'video/webm'
    ELSE NULL
  END AS mime_type,
  COALESCE((o.metadata->>'size')::bigint, NULL) AS size_bytes,
  -- Title = filename without path prefix or extension
  regexp_replace(
    regexp_replace(split_part(o.name, '/', array_length(string_to_array(o.name, '/'), 1)), '\.[^.]+$', ''),
    '[-_]+', ' ', 'g'
  ) AS title,
  '' AS description,
  '' AS alt_text,
  NULL AS folder_id,
  COALESCE(o.created_at, now()) AS created_at,
  COALESCE(o.updated_at, now()) AS updated_at
FROM storage.objects o
WHERE o.bucket_id IN ('editor-images', 'row-overlays')
  AND NOT EXISTS (
    SELECT 1 FROM public.media_assets m
    WHERE m.storage_path = o.name AND m.bucket = o.bucket_id
  );