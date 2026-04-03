
-- Restore SELECT access on site_content for admin and anon users
-- Admin needs direct table access for the CMS dashboard
-- Anon needs access so the site_content_public view (with security_invoker) works

CREATE POLICY "Admins can read all site content"
ON public.site_content FOR SELECT
TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Anon can read site content for public view"
ON public.site_content FOR SELECT
TO anon USING (true);
