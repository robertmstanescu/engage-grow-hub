
INSERT INTO storage.buckets (id, name, public)
VALUES ('row-overlays', 'row-overlays', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Row overlay images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'row-overlays');

CREATE POLICY "Admins can upload row overlays"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'row-overlays' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update row overlays"
ON storage.objects FOR UPDATE
USING (bucket_id = 'row-overlays' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete row overlays"
ON storage.objects FOR DELETE
USING (bucket_id = 'row-overlays' AND public.is_admin(auth.uid()));
