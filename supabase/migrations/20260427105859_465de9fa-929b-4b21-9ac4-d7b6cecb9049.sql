
-- Icon library table for admin-uploaded custom icons
CREATE TABLE public.icon_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  mime_type TEXT,
  tags TEXT[] DEFAULT '{}'::text[],
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_icon_library_name ON public.icon_library (lower(name));
CREATE INDEX idx_icon_library_tags ON public.icon_library USING GIN (tags);

ALTER TABLE public.icon_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read icon library"
  ON public.icon_library FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert icons"
  ON public.icon_library FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update icons"
  ON public.icon_library FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete icons"
  ON public.icon_library FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_icon_library_updated_at
  BEFORE UPDATE ON public.icon_library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Public storage bucket for icon files
INSERT INTO storage.buckets (id, name, public)
VALUES ('icons', 'icons', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read icon files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'icons');

CREATE POLICY "Admins can upload icons"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'icons' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update icon files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'icons' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'icons' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete icon files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'icons' AND public.is_admin(auth.uid()));
