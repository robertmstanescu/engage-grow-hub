CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((_user_id = auth.uid() OR auth.role() = 'service_role')
    AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = _user_id), false);
$$;

CREATE OR REPLACE FUNCTION public.is_public_site_section(_key text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT COALESCE(_key = ANY (ARRAY[
    'author_profile', 'blog_page', 'brand_settings', 'branding', 'contact',
    'footer', 'hero', 'intro', 'main_page_seo', 'navbar', 'page_rows',
    'pillar_comms', 'pillar_ex', 'services_comms', 'services_ex',
    'social_links', 'tags_config', 'theme', 'global_seo_tags',
    'error_404', 'error_boundary'
  ]::text[]), false);
$$;
REVOKE ALL ON FUNCTION public.is_public_site_section(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_public_site_section(text) TO anon, authenticated, service_role;

ALTER POLICY "Anon can read published site content" ON public.site_content
USING (public.is_public_site_section(section_key));

CREATE OR REPLACE FUNCTION public.get_site_content_public_rows()
RETURNS TABLE(id uuid, section_key text, content jsonb, draft_content jsonb, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT sc.id, sc.section_key, sc.content,
    CASE WHEN public.is_admin(auth.uid()) THEN sc.draft_content ELSE NULL::jsonb END,
    sc.updated_at
  FROM public.site_content sc
  WHERE public.is_public_site_section(sc.section_key) OR public.is_admin(auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_published_global_widget(_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.site_content sc
    WHERE public.is_public_site_section(sc.section_key)
      AND jsonb_path_exists(sc.content, '$.**.__global_ref ? (@ == $id)', jsonb_build_object('id', _id::text))
    UNION ALL
    SELECT 1 FROM public.cms_pages cp
    WHERE cp.status = 'published'
      AND jsonb_path_exists(cp.page_rows, '$.**.__global_ref ? (@ == $id)', jsonb_build_object('id', _id::text))
    UNION ALL
    SELECT 1 FROM public.blog_posts bp
    WHERE bp.status = 'published'
      AND jsonb_path_exists(bp.page_rows, '$.**.__global_ref ? (@ == $id)', jsonb_build_object('id', _id::text))
    UNION ALL
    SELECT 1 FROM public.work_items wi
    WHERE wi.status = 'published'
      AND jsonb_path_exists(wi.case_rows, '$.**.__global_ref ? (@ == $id)', jsonb_build_object('id', _id::text))
  );
$$;
REVOKE ALL ON FUNCTION public.is_published_global_widget(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_published_global_widget(uuid) TO anon, authenticated, service_role;
ALTER POLICY "Anyone can read global widgets" ON public.global_widgets
TO anon, authenticated USING (public.is_published_global_widget(id));

DROP POLICY "Anyone can read icon library" ON public.icon_library;
CREATE POLICY "Admins can read icon library" ON public.icon_library
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
REVOKE SELECT ON public.icon_library FROM anon, PUBLIC;
GRANT SELECT ON public.icon_library TO authenticated;
GRANT ALL ON public.icon_library TO service_role;

DROP POLICY "Public can read icon files" ON storage.objects;
CREATE POLICY "Admins can list icon files" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'icons' AND public.is_admin(auth.uid()));