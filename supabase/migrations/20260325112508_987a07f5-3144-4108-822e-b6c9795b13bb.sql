
-- Fix 1: Redefine site_content_public view to hide draft_content from non-admins
CREATE OR REPLACE VIEW public.site_content_public AS
SELECT
  id,
  section_key,
  content,
  updated_at,
  CASE
    WHEN public.is_admin(auth.uid()) THEN draft_content
    ELSE NULL
  END AS draft_content
FROM public.site_content;

-- Fix 3: Replace open INSERT policy on contacts with service_role only
-- (client will use an edge function instead)
DROP POLICY IF EXISTS "Anyone can insert contacts" ON public.contacts;

CREATE POLICY "Service role can insert contacts"
  ON public.contacts
  FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'service_role'::text);
