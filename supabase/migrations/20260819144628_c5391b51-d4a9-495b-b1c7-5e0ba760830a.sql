UPDATE cms_pages p
SET page_rows = (
  SELECT jsonb_agg(
    CASE WHEN (r->'layout'->>'columns')::int = 1 AND r->'layout' ? 'column_widths'
      THEN jsonb_set(r, '{layout}', (r->'layout') - 'column_widths')
      ELSE r END
    ORDER BY ord
  )
  FROM jsonb_array_elements(p.page_rows) WITH ORDINALITY AS t(r, ord)
),
draft_page_rows = CASE WHEN p.draft_page_rows IS NULL THEN NULL ELSE (
  SELECT jsonb_agg(
    CASE WHEN (r->'layout'->>'columns')::int = 1 AND r->'layout' ? 'column_widths'
      THEN jsonb_set(r, '{layout}', (r->'layout') - 'column_widths')
      ELSE r END
    ORDER BY ord
  )
  FROM jsonb_array_elements(p.draft_page_rows) WITH ORDINALITY AS t2(r, ord)
) END
WHERE p.page_rows IS NOT NULL;