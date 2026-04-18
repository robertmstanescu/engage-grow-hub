-- Add alt-text columns to blog_posts for image SEO.
-- Each column is optional and capped at 100 characters via CHECK constraint
-- so the limit is enforced at the database layer, not just in the UI.
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS cover_image_alt   text,
  ADD COLUMN IF NOT EXISTS author_image_alt  text,
  ADD COLUMN IF NOT EXISTS og_image_alt      text;

ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_cover_image_alt_max_100
    CHECK (cover_image_alt IS NULL OR char_length(cover_image_alt) <= 100);

ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_author_image_alt_max_100
    CHECK (author_image_alt IS NULL OR char_length(author_image_alt) <= 100);

ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_og_image_alt_max_100
    CHECK (og_image_alt IS NULL OR char_length(og_image_alt) <= 100);

COMMENT ON COLUMN public.blog_posts.cover_image_alt IS
  'SEO/accessibility alt text for cover_image. Max 100 chars.';
COMMENT ON COLUMN public.blog_posts.author_image_alt IS
  'SEO/accessibility alt text for author_image. Max 100 chars.';
COMMENT ON COLUMN public.blog_posts.og_image_alt IS
  'SEO/accessibility alt text for og_image. Max 100 chars.';