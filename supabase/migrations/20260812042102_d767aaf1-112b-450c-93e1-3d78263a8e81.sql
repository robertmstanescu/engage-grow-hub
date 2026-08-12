-- ── 1. Media library: stop public enumeration ─────────────────────────────
DROP POLICY IF EXISTS "Anyone can read media assets" ON public.media_assets;
DROP POLICY IF EXISTS "Anyone can read media folders" ON public.media_folders;

CREATE POLICY "Admins can read media assets"
  ON public.media_assets FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can read media folders"
  ON public.media_folders FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

REVOKE SELECT ON public.media_assets FROM anon;
REVOKE SELECT ON public.media_folders FROM anon;

-- Narrow, id-keyed public accessor: no listing, no seo_metadata dump.
CREATE OR REPLACE FUNCTION public.get_public_media_asset(_id uuid)
RETURNS TABLE(id uuid, bucket text, storage_path text, mime_type text,
              size_bytes bigint, title text, alt_text text, description text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.bucket, m.storage_path, m.mime_type, m.size_bytes,
         m.title, m.alt_text, m.description
  FROM public.media_assets m
  WHERE m.id = _id
$$;

REVOKE ALL ON FUNCTION public.get_public_media_asset(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_media_asset(uuid) TO anon, authenticated, service_role;

-- ── 2. Hide draft_page_rows from anonymous readers ────────────────────────
REVOKE SELECT (draft_page_rows) ON public.blog_posts FROM anon;
REVOKE SELECT (draft_page_rows) ON public.cms_pages  FROM anon;

-- ── 3. Lock down SECURITY DEFINER functions ───────────────────────────────
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.delete_email(text, bigint)',
    'public.enqueue_email(text, jsonb)',
    'public.read_email_batch(text, integer, integer)',
    'public.move_to_dlq(text, text, bigint, jsonb)',
    'public.email_queue_dispatch()',
    'public.email_queue_wake()',
    'public.run_scheduled_publishing()',
    'public.stitch_visitor_to_email(text, text)',
    'public.snapshot_page_revision(text, text, jsonb, text)',
    'public.handle_new_user()',
    'public.trg_snapshot_blog_post()',
    'public.trg_snapshot_cms_page()',
    'public.trg_snapshot_site_content()',
    'public.enforce_media_folder_depth()',
    'public.update_updated_at_column()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;

-- Admin-only RPC: keep for signed-in users (function itself checks is_admin).
REVOKE ALL ON FUNCTION public.restore_page_revision(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_page_revision(uuid) TO authenticated, service_role;

-- is_admin: needed by signed-in users / edge functions, never by anon.
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

-- Public site content accessor stays reachable anonymously (it filters drafts).
REVOKE ALL ON FUNCTION public.get_site_content_public_rows() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_site_content_public_rows() TO anon, authenticated, service_role;
