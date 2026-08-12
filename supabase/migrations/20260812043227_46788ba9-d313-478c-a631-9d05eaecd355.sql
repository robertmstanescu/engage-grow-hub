-- 1) site_content: stop exposing draft_content to anon via direct table reads.
REVOKE SELECT ON public.site_content FROM anon;
GRANT SELECT (id, section_key, content, updated_at, publish_at, expiry_at) ON public.site_content TO anon;

-- 2) Least privilege on SECURITY DEFINER functions in the exposed API schema.
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.run_scheduled_publishing() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.snapshot_page_revision(text, text, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.stitch_visitor_to_email(text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.email_queue_dispatch() TO service_role;
GRANT EXECUTE ON FUNCTION public.run_scheduled_publishing() TO service_role;
GRANT EXECUTE ON FUNCTION public.snapshot_page_revision(text, text, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.stitch_visitor_to_email(text, text) TO service_role;

-- Public-facing / admin-guarded definer functions keep only the grants they need.
REVOKE ALL ON FUNCTION public.get_public_media_asset(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_media_asset(uuid) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_site_content_public_rows() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_site_content_public_rows() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.restore_page_revision(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_page_revision(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;