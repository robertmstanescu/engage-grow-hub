ALTER TABLE public.cms_pages
  ADD COLUMN IF NOT EXISTS draft_meta_title text,
  ADD COLUMN IF NOT EXISTS draft_meta_description text,
  ADD COLUMN IF NOT EXISTS draft_ai_summary text,
  ADD COLUMN IF NOT EXISTS draft_og_image text;

ALTER TABLE public.work_items
  ADD COLUMN IF NOT EXISTS draft_meta_title text,
  ADD COLUMN IF NOT EXISTS draft_meta_description text,
  ADD COLUMN IF NOT EXISTS draft_ai_summary text;

COMMENT ON COLUMN public.cms_pages.draft_meta_title IS 'Unpublished search title. NULL means same as live.';
COMMENT ON COLUMN public.cms_pages.draft_meta_description IS 'Unpublished search description. NULL means same as live.';
COMMENT ON COLUMN public.cms_pages.draft_ai_summary IS 'Unpublished AI summary. NULL means same as live.';
COMMENT ON COLUMN public.cms_pages.draft_og_image IS 'Unpublished share picture. NULL means same as live.';
COMMENT ON COLUMN public.work_items.draft_meta_title IS 'Unpublished search title. NULL means same as live.';
COMMENT ON COLUMN public.work_items.draft_meta_description IS 'Unpublished search description. NULL means same as live.';
COMMENT ON COLUMN public.work_items.draft_ai_summary IS 'Unpublished AI summary. NULL means same as live.';