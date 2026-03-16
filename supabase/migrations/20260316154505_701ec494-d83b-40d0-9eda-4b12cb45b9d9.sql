
-- Create storage bucket for editor image uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('editor-images', 'editor-images', true);

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'editor-images');

-- Allow public read access to images
CREATE POLICY "Public can view editor images"
ON storage.objects FOR SELECT
USING (bucket_id = 'editor-images');

-- Allow authenticated users to delete their images
CREATE POLICY "Authenticated users can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'editor-images');
