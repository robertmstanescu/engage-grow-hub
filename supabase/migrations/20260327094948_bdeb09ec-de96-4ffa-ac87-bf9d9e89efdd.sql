
-- CMS Pages table for dynamic page creation
CREATE TABLE public.cms_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  template_type TEXT NOT NULL DEFAULT 'blank',
  page_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  draft_page_rows JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;

-- Public can read published pages
CREATE POLICY "Public can read published cms pages"
ON public.cms_pages FOR SELECT TO public
USING (status = 'published');

-- Admins can do everything
CREATE POLICY "Admins can manage cms pages"
ON public.cms_pages FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
