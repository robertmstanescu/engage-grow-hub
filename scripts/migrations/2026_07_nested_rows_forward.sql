-- =====================================================================
-- User Story 7.1 — Forward migration: legacy PageRow → PageRowV2.
-- Pure SQL alternative to scripts/migrations/2026_07_nested_rows_forward.ts
--
-- IDEMPOTENT: rows that already have schema_version = 2 are skipped.
-- TRANSACTIONAL: the whole script runs in a single transaction; if
-- anything fails (constraint violation, JSON exception, etc.) nothing
-- is committed.
--
-- Run:
--   psql "$DATABASE_URL" -f scripts/migrations/2026_07_nested_rows_forward.sql
-- =====================================================================
BEGIN;

-- ── Helper: convert one legacy row jsonb to a v2 row jsonb ────────────
-- Mirrors `migrateRowToV2()` in src/types/rows.ts so the runtime
-- renderer and the SQL transform produce IDENTICAL output.
CREATE OR REPLACE FUNCTION pg_temp.legacy_row_to_v2(legacy jsonb)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  contents     jsonb;
  widths       jsonb;
  n_cols       int;
  width_key    text;
  preset       text;
  cols_jsonb   jsonb := '[]'::jsonb;
  widget_data  jsonb;
  i            int;
BEGIN
  -- Already v2? short-circuit.
  IF (legacy ? 'schema_version') AND (legacy ->> 'schema_version') = '2' THEN
    RETURN legacy;
  END IF;

  -- Build [content, ...columns_data] preserving order.
  contents :=
    jsonb_build_array(COALESCE(legacy -> 'content', '{}'::jsonb))
    || COALESCE(legacy -> 'columns_data', '[]'::jsonb);

  n_cols := jsonb_array_length(contents);
  IF n_cols = 0 THEN
    contents := jsonb_build_array('{}'::jsonb);
    n_cols := 1;
  END IF;

  -- Compute widths: explicit layout.column_widths or even split.
  widths := COALESCE(legacy -> 'layout' -> 'column_widths', NULL);
  IF widths IS NULL THEN
    SELECT jsonb_agg((100 / n_cols)::int) INTO widths
      FROM generate_series(1, n_cols);
  END IF;

  -- Widths → preset key (e.g. "60-40", "33-33-33"); fallback "custom".
  SELECT string_agg((round(value::numeric))::text, '-' ORDER BY ordinality)
    INTO width_key
    FROM jsonb_array_elements_text(widths) WITH ORDINALITY;

  preset := CASE width_key
    WHEN '100'         THEN '100'
    WHEN '50-50'       THEN '50-50'
    WHEN '33-33-33'    THEN '33-33-33'
    WHEN '25-25-25-25' THEN '25-25-25-25'
    WHEN '60-40'       THEN '60-40'
    WHEN '40-60'       THEN '40-60'
    WHEN '70-30'       THEN '70-30'
    WHEN '30-70'       THEN '30-70'
    ELSE 'custom'
  END;

  -- Build the columns array, one widget per column carrying legacy.type.
  FOR i IN 0 .. n_cols - 1 LOOP
    widget_data := COALESCE(contents -> i, '{}'::jsonb);
    cols_jsonb := cols_jsonb || jsonb_build_array(jsonb_build_object(
      'id', gen_random_uuid()::text,
      'widgets', jsonb_build_array(jsonb_build_object(
        'id',   gen_random_uuid()::text,
        'type', legacy ->> 'type',
        'data', widget_data
      ))
    ));
  END LOOP;

  RETURN jsonb_strip_nulls(jsonb_build_object(
    'id',             legacy ->> 'id',
    'schema_version', 2,
    'strip_title',    legacy ->> 'strip_title',
    'bg_color',       legacy ->> 'bg_color',
    'scope',          legacy -> 'scope',
    'layout',         legacy -> 'layout',
    'column_layout',  preset,
    'columns',        cols_jsonb
  ));
END;
$$;

-- ── Helper: walk a `rows` array and convert each element ─────────────
CREATE OR REPLACE FUNCTION pg_temp.migrate_rows_array(arr jsonb)
RETURNS jsonb LANGUAGE sql AS $$
  SELECT COALESCE(jsonb_agg(pg_temp.legacy_row_to_v2(elem) ORDER BY ord), '[]'::jsonb)
    FROM jsonb_array_elements(COALESCE(arr, '[]'::jsonb)) WITH ORDINALITY AS t(elem, ord);
$$;

-- ── site_content: rewrite content.rows + draft_content.rows ──────────
UPDATE public.site_content SET
  content = jsonb_set(
    content,
    '{rows}',
    pg_temp.migrate_rows_array(content -> 'rows')
  )
WHERE jsonb_typeof(content -> 'rows') = 'array';

UPDATE public.site_content SET
  draft_content = jsonb_set(
    draft_content,
    '{rows}',
    pg_temp.migrate_rows_array(draft_content -> 'rows')
  )
WHERE draft_content IS NOT NULL
  AND jsonb_typeof(draft_content -> 'rows') = 'array';

-- ── cms_pages: rewrite page_rows + draft_page_rows ───────────────────
UPDATE public.cms_pages SET
  page_rows = pg_temp.migrate_rows_array(page_rows)
WHERE jsonb_typeof(page_rows) = 'array';

UPDATE public.cms_pages SET
  draft_page_rows = pg_temp.migrate_rows_array(draft_page_rows)
WHERE draft_page_rows IS NOT NULL
  AND jsonb_typeof(draft_page_rows) = 'array';

COMMIT;
