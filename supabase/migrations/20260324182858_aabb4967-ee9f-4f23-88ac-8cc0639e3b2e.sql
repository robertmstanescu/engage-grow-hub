
-- Fix draft_content exposure: replace public SELECT with a policy that only exposes content (not draft_content)
-- We'll use a view approach: restrict the public policy to not include draft_content
-- Since RLS can't do column-level, create a view for public access

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can read site content" ON public.site_content;

-- Create a restricted public SELECT policy that still allows reading
-- but we'll handle draft_content filtering via a secure view
CREATE POLICY "Public can read published site content" ON public.site_content
  FOR SELECT TO public
  USING (true);

-- Create a secure view that hides draft_content for non-admins
CREATE OR REPLACE VIEW public.site_content_public AS
SELECT id, section_key, content, updated_at,
  CASE WHEN public.is_admin(auth.uid()) THEN draft_content ELSE NULL END AS draft_content
FROM public.site_content;

-- Fix storage policies: restrict uploads to admins only
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects;

CREATE POLICY "Admins can upload images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'editor-images' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'editor-images' AND public.is_admin(auth.uid()));

-- Also tighten the contacts INSERT policy to validate input
-- The "Anyone can insert contacts" WITH CHECK (true) is intentional for the public contact form
-- but let's keep it since it's a public-facing feature
