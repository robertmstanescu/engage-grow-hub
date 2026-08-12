-- Table-level SELECT overrides column-level revokes, so drop it and
-- re-grant an explicit column list that excludes draft_page_rows.
REVOKE SELECT ON public.blog_posts FROM anon;
REVOKE SELECT ON public.cms_pages  FROM anon;

GRANT SELECT (
  id, slug, title, excerpt, content, category, status, published_at,
  created_at, updated_at, cover_image, cover_image_alt, author_name,
  author_image, author_image_alt, meta_title, meta_description, og_image,
  og_image_alt, tags, lead_magnet_asset_id, lead_magnet_cover_id,
  ai_summary, page_rows, publish_at, expiry_at
) ON public.blog_posts TO anon;

GRANT SELECT (
  id, slug, title, template_type, page_rows, status, created_at,
  updated_at, meta_title, meta_description, ai_summary, publish_at,
  expiry_at, og_image
) ON public.cms_pages TO anon;
