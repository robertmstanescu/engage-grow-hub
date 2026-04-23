CREATE OR REPLACE VIEW public.site_content_public
WITH (security_invoker = false) AS
SELECT
  id,
  section_key,
  content,
  CASE
    WHEN public.is_admin(auth.uid()) THEN draft_content
    ELSE NULL::jsonb
  END AS draft_content,
  updated_at
FROM public.site_content;

GRANT SELECT ON public.site_content_public TO anon, authenticated;