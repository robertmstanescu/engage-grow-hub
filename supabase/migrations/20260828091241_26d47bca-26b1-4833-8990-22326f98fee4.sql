-- CORRECTS migration 20260828084834_7943e4b9-b5ad-4033-844b-2f0606e9f99b.sql
-- (already applied, but a no-op): that migration assumed `page_rows`
-- elements were flat `{id, type, content}` objects. The real "V3" row
-- shape is deeply nested — `row.columns[].cells[].widgets[].data` (color
-- fields live in a WIDGET's `data`, not a row's `content`, and `type`
-- lives on the WIDGET, not the row) — confirmed against the live
-- `services/employee-experience` row via the public REST API. Because no
-- row ever has a top-level `type`, the old migration's
-- `elem->>'type' = 'service'` never matched anything, so it silently
-- rewrote every row to itself. This migration redoes the same color
-- assignment correctly by walking the real nested structure.
--
-- Same brand colors, same reasoning, as the original migration's header:
--   Internal Communications  #43143B
--   Employee Experience      #002B67
--   People Operations        #6A010E
--   Fractional HRBP          #003728
-- complemented by the shared Eliza gold (#E6C24C, CTA/price band) and
-- Isabelline neutral (#F3F0ED, section background).
CREATE OR REPLACE FUNCTION pg_temp.merge_widget_colors(rows jsonb, target_type text, patch jsonb)
RETURNS jsonb LANGUAGE sql AS $$
  -- Walks row -> columns -> cells -> widgets, merging `patch` into the
  -- `data` of every widget whose `type` matches `target_type`. Every
  -- other widget, cell, column, and row (including ones that don't have
  -- a `columns` key at all — the ` ? ` checks below skip recursion into
  -- a level that isn't present, leaving that element byte-for-byte
  -- unchanged rather than injecting a null) passes through untouched.
  SELECT COALESCE(
    jsonb_agg(
      CASE WHEN row_elem ? 'columns' THEN
        jsonb_set(row_elem, '{columns}', (
          SELECT COALESCE(jsonb_agg(
            CASE WHEN col_elem ? 'cells' THEN
              jsonb_set(col_elem, '{cells}', (
                SELECT COALESCE(jsonb_agg(
                  CASE WHEN cell_elem ? 'widgets' THEN
                    jsonb_set(cell_elem, '{widgets}', (
                      SELECT COALESCE(jsonb_agg(
                        CASE WHEN widget_elem->>'type' = target_type THEN
                          jsonb_set(widget_elem, '{data}', COALESCE(widget_elem->'data', '{}'::jsonb) || patch, true)
                        ELSE widget_elem END
                        ORDER BY w_ord
                      ), '[]'::jsonb)
                      FROM jsonb_array_elements(cell_elem->'widgets') WITH ORDINALITY AS ww(widget_elem, w_ord)
                    ))
                  ELSE cell_elem END
                  ORDER BY c_ord
                ), '[]'::jsonb)
                FROM jsonb_array_elements(col_elem->'cells') WITH ORDINALITY AS cc(cell_elem, c_ord)
              ))
            ELSE col_elem END
            ORDER BY col_ord
          ), '[]'::jsonb)
          FROM jsonb_array_elements(row_elem->'columns') WITH ORDINALITY AS colc(col_elem, col_ord)
        ))
      ELSE row_elem END
      ORDER BY r_ord
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements(rows) WITH ORDINALITY AS rr(row_elem, r_ord);
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
  page_rows = pg_temp.merge_widget_colors(cp.page_rows, 'service', pc.patch),
  draft_page_rows = CASE
    WHEN cp.draft_page_rows IS NOT NULL
    THEN pg_temp.merge_widget_colors(cp.draft_page_rows, 'service', pc.patch)
    ELSE cp.draft_page_rows
  END
FROM pillar_colors pc
WHERE cp.slug = pc.slug;

DROP FUNCTION pg_temp.merge_widget_colors(jsonb, text, jsonb);
