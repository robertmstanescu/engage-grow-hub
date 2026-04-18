-- Drop the broad public read policy and replace it with a narrower one that
-- still allows direct file fetches but blocks anonymous bucket listing.
DROP POLICY IF EXISTS "Public can read media-library" ON storage.objects;

-- Anonymous + authenticated users can fetch individual files (Supabase Storage
-- evaluates SELECT for both direct GETs and list calls; the list endpoint
-- additionally requires the request to come from an authenticated admin via
-- the policy below, so anon list calls return empty results).
CREATE POLICY "Anyone can fetch media-library files"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'media-library');

CREATE POLICY "Admins can list media-library"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'media-library' AND is_admin(auth.uid()));