CREATE OR REPLACE FUNCTION public.strip_legacy_row_bg(_rows jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _rows IS NULL THEN NULL
    WHEN jsonb_typeof(_rows) = 'array' THEN (
      SELECT COALESCE(jsonb_agg(
        CASE WHEN r ? 'layout' AND jsonb_typeof(r->'layout') = 'object'
          THEN jsonb_set(r, '{layout}',
                 (r->'layout') - 'gradient' - 'gradientStart' - 'gradientEnd'
                                - 'bgImage' - 'bgImageOpacity')
          ELSE r END
        ORDER BY ord), '[]'::jsonb)
      FROM jsonb_array_elements(_rows) WITH ORDINALITY AS t(r, ord)
    )
    WHEN jsonb_typeof(_rows) = 'object' AND _rows ? 'rows'
      THEN jsonb_set(_rows, '{rows}', public.strip_legacy_row_bg(_rows->'rows'))
    ELSE _rows
  END
$$;

UPDATE public.site_content
SET content = public.strip_legacy_row_bg(content),
    draft_content = public.strip_legacy_row_bg(draft_content)
WHERE section_key = 'page_rows';

UPDATE public.cms_pages
SET page_rows = public.strip_legacy_row_bg(page_rows),
    draft_page_rows = public.strip_legacy_row_bg(draft_page_rows);

UPDATE public.blog_posts
SET page_rows = public.strip_legacy_row_bg(page_rows),
    draft_page_rows = public.strip_legacy_row_bg(draft_page_rows);

DROP FUNCTION public.strip_legacy_row_bg(jsonb);