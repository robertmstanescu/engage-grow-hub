CREATE OR REPLACE FUNCTION public.is_public_site_section(_key text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT COALESCE(_key = ANY (ARRAY[
    'author_profile', 'blog_page', 'brand_settings', 'branding', 'contact',
    'footer', 'hero', 'intro', 'main_page_seo', 'navbar', 'page_rows',
    'pillar_comms', 'pillar_ex', 'services_comms', 'services_ex',
    'social_links', 'tags_config', 'theme', 'global_seo_tags',
    'error_404', 'error_boundary', 'work_page'
  ]::text[]), false);
$$;
REVOKE ALL ON FUNCTION public.is_public_site_section(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_public_site_section(text) TO anon, authenticated, service_role;

-- Regression check: the Work page must be included in public sections.
DO $$
BEGIN
  IF public.is_public_site_section('work_page') IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'work_page must be a public site section';
  END IF;
END;
$$;