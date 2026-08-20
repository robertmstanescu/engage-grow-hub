
-- 1) Hide draft + scheduling columns from anonymous visitors (re-affirm + extend)
REVOKE SELECT (draft_content, publish_at, expiry_at) ON public.site_content FROM anon;
REVOKE SELECT (draft_page_rows, publish_at, expiry_at) ON public.cms_pages FROM anon;
REVOKE SELECT (draft_page_rows, publish_at, expiry_at) ON public.blog_posts FROM anon;

-- 2) Make the anon read policies explicitly scoped
DROP POLICY IF EXISTS "Anon can read site content for public view" ON public.site_content;
CREATE POLICY "Anon can read published site content"
  ON public.site_content FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "Published posts are viewable by everyone" ON public.blog_posts;
CREATE POLICY "Published posts are viewable by everyone"
  ON public.blog_posts FOR SELECT TO anon, authenticated
  USING (status = 'published' OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public can read published cms pages" ON public.cms_pages;
CREATE POLICY "Public can read published cms pages"
  ON public.cms_pages FOR SELECT TO anon, authenticated
  USING (status = 'published' OR public.is_admin(auth.uid()));

-- 3) Lock down SECURITY DEFINER functions: no PUBLIC/anon/authenticated execute
--    for internal-only routines.
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prosecdef
       AND p.proname NOT IN ('is_admin', 'get_site_content_public_rows',
                             'get_public_media_asset', 'restore_page_revision')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
  END LOOP;
END $$;

-- Public-facing helpers keep only the access they need.
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.restore_page_revision(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_page_revision(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_site_content_public_rows() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_site_content_public_rows() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_public_media_asset(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_media_asset(uuid) TO anon, authenticated, service_role;
