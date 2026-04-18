-- Recreate the view with security_invoker (default) so it respects RLS of the caller.
DROP VIEW IF EXISTS public.site_content_public;

CREATE VIEW public.site_content_public
  WITH (security_invoker = true) AS
  SELECT
    id,
    section_key,
    content,
    CASE WHEN public.is_admin(auth.uid()) THEN draft_content ELSE NULL END AS draft_content,
    updated_at
  FROM public.site_content;

GRANT SELECT ON public.site_content_public TO anon, authenticated;

-- Add back an anon SELECT policy on the table — required for the view to read rows
-- under security_invoker. We restrict columns via GRANT below so draft_content stays hidden.
CREATE POLICY "Anon can read site content for public view"
  ON public.site_content
  FOR SELECT
  TO anon
  USING (true);

-- Column-level privileges: revoke broad access, then grant only the safe columns
-- to anon. This blocks `select draft_content` even via direct table queries.
REVOKE SELECT ON public.site_content FROM anon;
GRANT SELECT (id, section_key, content, updated_at) ON public.site_content TO anon;