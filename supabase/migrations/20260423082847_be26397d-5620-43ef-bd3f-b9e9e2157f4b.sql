-- Grant public read access to the site_content_public view so the
-- frontend (logged-out visitors / any browser without a session) can
-- load CMS content. Safari users with no admin session were getting
-- 401s on every request, resulting in a blank page.
GRANT SELECT ON public.site_content_public TO anon, authenticated;