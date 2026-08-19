UPDATE site_content
SET content = jsonb_set(
  jsonb_set(
    COALESCE(content, '{}'::jsonb),
    '{meta_title}',
    '"Fractional People & Comms Consultancy | The Magic Coffin"'::jsonb
  ),
  '{meta_description}',
  '"Internal comms, employee experience, people ops and fractional HRBP consulting for scale-ups. Fix culture gaps, align teams, make change stick."'::jsonb
)
WHERE section_key = 'main_page_seo';