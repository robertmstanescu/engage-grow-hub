WITH tones AS (
  SELECT * FROM (VALUES
    ('row_hero_c88d4c9be183','white'),
    ('dee9cf78-a8b1-4833-8aac-e54056427c69','tint'),
    ('025af6ed-2699-471c-804e-e5deb67c073f','white'),
    ('ee464dc4-e1b2-491f-b497-dbf861dded64','tint'),
    ('be49a60c-c590-4b0f-b668-62cd08f01c09','deep'),
    ('a679082b-a629-4e8a-b57b-5f4743c44d3f','white')
  ) AS t(row_id, tone)
), rebuilt AS (
  SELECT jsonb_agg(
    (r - 'bg_color')
    || jsonb_build_object(
         'layout',
         COALESCE(r->'layout','{}'::jsonb)
           - 'gradient' - 'gradientStart' - 'gradientEnd'
           || jsonb_build_object('bandTone', COALESCE(t.tone,'auto'))
       )
    ORDER BY ord
  ) AS rows
  FROM site_content sc,
       jsonb_array_elements(sc.content->'rows') WITH ORDINALITY AS e(r, ord)
       LEFT JOIN tones t ON t.row_id = e.r->>'id'
  WHERE sc.section_key = 'page_rows'
)
UPDATE site_content sc
SET content = jsonb_set(sc.content, '{rows}', rebuilt.rows),
    updated_at = now()
FROM rebuilt
WHERE sc.section_key = 'page_rows';