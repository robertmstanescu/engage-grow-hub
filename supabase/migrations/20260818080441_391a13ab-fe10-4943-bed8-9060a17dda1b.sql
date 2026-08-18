WITH rebuilt AS (
  SELECT jsonb_agg(
    (r - 'layout')
    || jsonb_build_object(
         'layout',
         COALESCE(r->'layout','{}'::jsonb)
           || jsonb_build_object('snapEnabled', (e.r->>'id') = 'row_hero_c88d4c9be183')
       )
    ORDER BY ord
  ) AS rows
  FROM site_content sc,
       jsonb_array_elements(sc.content->'rows') WITH ORDINALITY AS e(r, ord)
  WHERE sc.section_key = 'page_rows'
)
UPDATE site_content sc
SET content = jsonb_set(sc.content, '{rows}', rebuilt.rows),
    updated_at = now()
FROM rebuilt
WHERE sc.section_key = 'page_rows';