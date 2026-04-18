-- ============================================================
-- 1. MEDIA FOLDERS (max 1 level of nesting)
-- ============================================================
CREATE TABLE public.media_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES public.media_folders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_folders_parent ON public.media_folders(parent_id);

-- Enforce maximum 1 level of nesting (a folder whose parent already has a parent is rejected)
CREATE OR REPLACE FUNCTION public.enforce_media_folder_depth()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  parent_has_parent boolean;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT (parent_id IS NOT NULL) INTO parent_has_parent
    FROM public.media_folders WHERE id = NEW.parent_id;
  IF parent_has_parent THEN
    RAISE EXCEPTION 'Media folders support only one level of nesting';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_media_folder_depth
  BEFORE INSERT OR UPDATE ON public.media_folders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_media_folder_depth();

ALTER TABLE public.media_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read media folders"
  ON public.media_folders FOR SELECT
  USING (true);

CREATE POLICY "Admins manage media folders"
  ON public.media_folders FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- ============================================================
-- 2. MEDIA ASSETS
-- ============================================================
CREATE TABLE public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  bucket text NOT NULL DEFAULT 'media-library',
  mime_type text,
  size_bytes bigint,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  alt_text text NOT NULL DEFAULT '',
  seo_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  folder_id uuid REFERENCES public.media_folders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket, storage_path)
);

CREATE INDEX idx_media_assets_folder ON public.media_assets(folder_id);
CREATE INDEX idx_media_assets_created ON public.media_assets(created_at DESC);

CREATE TRIGGER trg_media_assets_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read media assets"
  ON public.media_assets FOR SELECT
  USING (true);

CREATE POLICY "Admins manage media assets"
  ON public.media_assets FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- ============================================================
-- 3. LEADS (separate from contacts)
-- ============================================================
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  company_university text NOT NULL,
  title text NOT NULL,
  email text NOT NULL UNIQUE,
  download_history text[] NOT NULL DEFAULT '{}',
  marketing_consent boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_email ON public.leads(email);
CREATE INDEX idx_leads_created ON public.leads(created_at DESC);

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete leads"
  ON public.leads FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role can manage leads"
  ON public.leads FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 4. BLOG POSTS — lead magnet linkage
-- ============================================================
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS lead_magnet_asset_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_magnet_cover_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL;

-- ============================================================
-- 5. STORAGE BUCKET: media-library (public read, admin write)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
  VALUES ('media-library', 'media-library', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read media-library"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media-library');

CREATE POLICY "Admins can upload to media-library"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'media-library' AND is_admin(auth.uid()));

CREATE POLICY "Admins can update media-library"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'media-library' AND is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'media-library' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete from media-library"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'media-library' AND is_admin(auth.uid()));