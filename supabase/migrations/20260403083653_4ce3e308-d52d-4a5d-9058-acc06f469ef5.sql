
-- Drop the overly permissive public SELECT policy on site_content base table
DROP POLICY IF EXISTS "Public can read published site content" ON public.site_content;

-- Recreate the view with security_invoker = true so it respects the caller's role
CREATE OR REPLACE VIEW public.site_content_public
  WITH (security_invoker = true) AS
  SELECT id, section_key, content, updated_at,
         CASE WHEN public.is_admin(auth.uid()) THEN draft_content ELSE NULL END AS draft_content
  FROM public.site_content;

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.site_content_public TO anon, authenticated;
