-- Assign each of the 4 service pillars its brand color, applied as a
-- full page palette (per src/features/admin/site-editor/PillarEditor.tsx's
-- "Section Colors" fields) rather than just one accent:
--
--   Internal Communications  #43143B
--   Employee Experience      #002B67
--   People Operations        #6A010E
--   Fractional HRBP          #003728
--
-- Complemented with the site's existing shared brand accent/neutral —
-- "Eliza" (#E6C24C) for the CTA/price footer band, "Isabelline"
-- (#F3F0ED) for the section background — so the 4 distinct pillar hues
-- still read as one cohesive design system instead of 4 clashing
-- palettes. (Card body copy is left unset, keeping the existing shared
-- neutral gray — outcome/description text should stay legible and
-- pillar-agnostic.)
--
-- `page_rows` is the live published content; `draft_page_rows` is only
-- non-null while an admin has an unpublished draft open, so we patch
-- both (when present) to keep the admin's editor in sync with what
-- publishes.
--
-- Each page's row array is walked and the color keys are merged into
-- the CONTENT of its `type = 'service'` row only — every other field on
-- that row (title, deliverables, tag colors, etc.) and every other row
-- on the page is left untouched.
CREATE OR REPLACE FUNCTION pg_temp.merge_service_row_colors(rows jsonb, patch jsonb)
RETURNS jsonb LANGUAGE sql AS $$
  SELECT COALESCE(
    jsonb_agg(
      CASE WHEN elem->>'type' = 'service'
        THEN jsonb_set(elem, '{content}', COALESCE(elem->'content', '{}'::jsonb) || patch, true)
        ELSE elem
      END
      ORDER BY ord
    ),
    rows
  )
  FROM jsonb_array_elements(rows) WITH ORDINALITY AS t(elem, ord);
$$;

WITH pillar_colors (slug, patch) AS (
  VALUES
    ('services/internal-communications', '{
      "color_section_bg": "#F3F0ED",
      "color_label": "#43143B",
      "color_heading": "#43143B",
      "color_heading_sub": "#43143B",
      "color_card_title": "#43143B",
      "color_subtitle": "#43143B",
      "color_deliverables_label": "#43143B",
      "color_meta_bg": "#E6C24C",
      "color_meta_fg": "#43143B",
      "color_cta_text": "#43143B",
      "color_note_border": "#43143B"
    }'::jsonb),
    ('services/employee-experience', '{
      "color_section_bg": "#F3F0ED",
      "color_label": "#002B67",
      "color_heading": "#002B67",
      "color_heading_sub": "#002B67",
      "color_card_title": "#002B67",
      "color_subtitle": "#002B67",
      "color_deliverables_label": "#002B67",
      "color_meta_bg": "#E6C24C",
      "color_meta_fg": "#002B67",
      "color_cta_text": "#002B67",
      "color_note_border": "#002B67"
    }'::jsonb),
    ('services/people-operations', '{
      "color_section_bg": "#F3F0ED",
      "color_label": "#6A010E",
      "color_heading": "#6A010E",
      "color_heading_sub": "#6A010E",
      "color_card_title": "#6A010E",
      "color_subtitle": "#6A010E",
      "color_deliverables_label": "#6A010E",
      "color_meta_bg": "#E6C24C",
      "color_meta_fg": "#6A010E",
      "color_cta_text": "#6A010E",
      "color_note_border": "#6A010E"
    }'::jsonb),
    ('services/fractional-hrbp', '{
      "color_section_bg": "#F3F0ED",
      "color_label": "#003728",
      "color_heading": "#003728",
      "color_heading_sub": "#003728",
      "color_card_title": "#003728",
      "color_subtitle": "#003728",
      "color_deliverables_label": "#003728",
      "color_meta_bg": "#E6C24C",
      "color_meta_fg": "#003728",
      "color_cta_text": "#003728",
      "color_note_border": "#003728"
    }'::jsonb)
)
UPDATE public.cms_pages cp
SET
  page_rows = pg_temp.merge_service_row_colors(cp.page_rows, pc.patch),
  draft_page_rows = CASE
    WHEN cp.draft_page_rows IS NOT NULL
    THEN pg_temp.merge_service_row_colors(cp.draft_page_rows, pc.patch)
    ELSE cp.draft_page_rows
  END
FROM pillar_colors pc
WHERE cp.slug = pc.slug;

DROP FUNCTION pg_temp.merge_service_row_colors(jsonb, jsonb);

-- Blog post category badges (src/hooks/useTagColors.ts) are colored via
-- the `tags_config` site_content row when one exists, falling back to
-- the DEFAULT_TAGS code constant otherwise. Only 2 of the 4 pillars had
-- a color at all (in an old, pre-brand-guideline hex), so this upserts
-- all 4 with the correct brand hex — creating the row with sensible
-- defaults if no admin has customized tags yet, or merging just the 4
-- pillar entries into the existing array (preserving any other
-- categories, like "General", and `service_tag_types` untouched) if one
-- already exists.
INSERT INTO public.site_content (section_key, content)
VALUES ('tags_config', jsonb_build_object(
  'service_tag_types', jsonb_build_array(
    jsonb_build_object('label', 'Fixed project', 'value', 'fixed', 'bgColor', '#4D1B5E', 'textColor', '#F9F0C1'),
    jsonb_build_object('label', 'Monthly retainer', 'value', 'retainer', 'bgColor', '#E5C54F', 'textColor', '#2A0E33')
  ),
  'blog_categories', jsonb_build_array(
    jsonb_build_object('label', 'Internal Communications', 'bgColor', '#43143B', 'textColor', '#FFFFFF'),
    jsonb_build_object('label', 'Employee Experience', 'bgColor', '#002B67', 'textColor', '#FFFFFF'),
    jsonb_build_object('label', 'People Operations', 'bgColor', '#6A010E', 'textColor', '#FFFFFF'),
    jsonb_build_object('label', 'Fractional HRBP', 'bgColor', '#003728', 'textColor', '#FFFFFF'),
    jsonb_build_object('label', 'General', 'bgColor', '#7B3A91', 'textColor', '#FFFFFF')
  )
))
ON CONFLICT (section_key) DO UPDATE
SET content = jsonb_set(
  site_content.content,
  '{blog_categories}',
  (
    SELECT COALESCE(jsonb_agg(cat), '[]'::jsonb)
    FROM (
      SELECT cat
      FROM jsonb_array_elements(COALESCE(site_content.content->'blog_categories', '[]'::jsonb)) AS cat
      WHERE cat->>'label' NOT IN (
        'Internal Communications', 'Employee Experience', 'People Operations', 'Fractional HRBP'
      )
      UNION ALL
      SELECT jsonb_build_object('label', 'Internal Communications', 'bgColor', '#43143B', 'textColor', '#FFFFFF')
      UNION ALL
      SELECT jsonb_build_object('label', 'Employee Experience', 'bgColor', '#002B67', 'textColor', '#FFFFFF')
      UNION ALL
      SELECT jsonb_build_object('label', 'People Operations', 'bgColor', '#6A010E', 'textColor', '#FFFFFF')
      UNION ALL
      SELECT jsonb_build_object('label', 'Fractional HRBP', 'bgColor', '#003728', 'textColor', '#FFFFFF')
    ) merged(cat)
  ),
  true
);