DROP VIEW IF EXISTS public.site_content_public;

CREATE VIEW public.site_content_public
  WITH (security_invoker = false) AS
  SELECT
    id,
    section_key,
    content,
    CASE WHEN public.is_admin(auth.uid()) THEN draft_content ELSE NULL END AS draft_content,
    updated_at
  FROM public.site_content;

GRANT SELECT ON public.site_content_public TO anon, authenticated;

DROP POLICY IF EXISTS "Anon can read site content for public view" ON public.site_content;
DROP POLICY IF EXISTS "Anyone can read site content" ON public.site_content;