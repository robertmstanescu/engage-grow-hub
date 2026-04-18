-- ============================================================================
-- Storage bucket hardening
-- ============================================================================
-- Goal: prevent anonymous enumeration of bucket contents while keeping
-- individual files accessible via the public CDN URL.
--
-- How Supabase storage RLS works:
--   * When a bucket is marked `public = true`, individual GET requests to
--     /storage/v1/object/public/<bucket>/<path> bypass RLS entirely. So
--     <img src="..."> tags on the website continue to work with NO policy.
--   * The JS client's `.list()` call DOES go through RLS on storage.objects.
--     That is the call we want to lock down to admins only.
--   * Inserts, updates, and deletes always go through RLS.
--
-- We therefore:
--   1. DROP the two old "Public can view ..." SELECT policies that allowed
--      anonymous .list() enumeration.
--   2. Replace them with admin-only SELECT policies (admins still need to
--      list files in the Media Gallery and overlay picker).
--   3. Leave INSERT / UPDATE / DELETE policies untouched — those were
--      already admin-restricted.
-- ============================================================================

-- editor-images bucket ------------------------------------------------------
DROP POLICY IF EXISTS "Public can view editor images" ON storage.objects;

CREATE POLICY "Admins can list editor images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'editor-images'
    AND public.is_admin(auth.uid())
  );

-- row-overlays bucket -------------------------------------------------------
DROP POLICY IF EXISTS "Row overlay images are publicly accessible" ON storage.objects;

CREATE POLICY "Admins can list row overlays"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'row-overlays'
    AND public.is_admin(auth.uid())
  );

-- ============================================================================
-- Note: both buckets remain `public = true`. Individual files are still
-- served via /storage/v1/object/public/<bucket>/<path> without authentication.
-- Only directory-style listing has been locked down.
-- ============================================================================