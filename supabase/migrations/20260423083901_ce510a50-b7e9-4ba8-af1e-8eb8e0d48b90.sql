CREATE OR REPLACE FUNCTION public.get_site_content_public_rows()
RETURNS TABLE (
  id uuid,
  section_key text,
  content jsonb,
  draft_content jsonb,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sc.id,
    sc.section_key,
    sc.content,
    CASE
      WHEN public.is_admin(auth.uid()) THEN sc.draft_content
      ELSE NULL::jsonb
    END AS draft_content,
    sc.updated_at
  FROM public.site_content sc
$$;

REVOKE ALL ON FUNCTION public.get_site_content_public_rows() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_site_content_public_rows() TO anon, authenticated;

CREATE OR REPLACE VIEW public.site_content_public
WITH (security_invoker = true) AS
SELECT *
FROM public.get_site_content_public_rows();

GRANT SELECT ON public.site_content_public TO anon, authenticated;