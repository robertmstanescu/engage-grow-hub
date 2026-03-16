ALTER TABLE public.site_content ADD COLUMN IF NOT EXISTS draft_content jsonb;
UPDATE public.site_content SET draft_content = content WHERE draft_content IS NULL;