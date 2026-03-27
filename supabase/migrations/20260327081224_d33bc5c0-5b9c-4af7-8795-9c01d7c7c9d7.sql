ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS author_name text DEFAULT null;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS author_image text DEFAULT null;