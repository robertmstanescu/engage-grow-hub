-- Harden anon-callable SECURITY DEFINER functions.

-- 1) get_public_media_asset: only expose metadata for assets in public buckets.
CREATE OR REPLACE FUNCTION public.get_public_media_asset(_id uuid)
 RETURNS TABLE(id uuid, bucket text, storage_path text, mime_type text, size_bytes bigint, title text, alt_text text, description text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT m.id, m.bucket, m.storage_path, m.mime_type, m.size_bytes,
         m.title, m.alt_text, m.description
  FROM public.media_assets m
  WHERE m.id = _id
    AND EXISTS (
      SELECT 1 FROM storage.buckets b
      WHERE b.id = m.bucket AND b.public = true
    )
$function$;

REVOKE ALL ON FUNCTION public.get_public_media_asset(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_media_asset(uuid) TO anon, authenticated, service_role;

-- 2) get_site_content_public_rows already masks drafts for non-admins; keep grants explicit.
REVOKE ALL ON FUNCTION public.get_site_content_public_rows() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_site_content_public_rows() TO anon, authenticated, service_role;

-- 3) Ensure no anon access to admin-gated definer functions.
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.restore_page_revision(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_page_revision(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.analytics_page_stats(timestamptz, timestamptz, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_page_stats(timestamptz, timestamptz, text, text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.analytics_referrer_stats(timestamptz, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_referrer_stats(timestamptz, timestamptz, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.analytics_visitor_depth(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_visitor_depth(timestamptz, timestamptz) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.analytics_page_transitions(timestamptz, timestamptz, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_page_transitions(timestamptz, timestamptz, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.analytics_page_breakdown(text, timestamptz, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_page_breakdown(text, timestamptz, timestamptz, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.analytics_page_trend(text, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_page_trend(text, timestamptz, timestamptz) TO authenticated, service_role;