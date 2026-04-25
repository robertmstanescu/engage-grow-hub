-- US 17.x — Blog posts get widget-based composition.
-- Additive change: keep `content` (HTML) for backward compatibility,
-- but add `page_rows` + `draft_page_rows` so blog posts can be composed
-- in the new widget builder just like the main page and CMS pages.
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS page_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS draft_page_rows jsonb;