-- =====================================================================
-- User Story 7.1 — Rollback for the nested-rows migration.
-- Pure SQL alternative to scripts/migrations/2026_07_nested_rows_rollback.ts
--
-- Reduces a v2 row back to legacy ONLY when reducible:
--   • every column has exactly one widget, AND
--   • every widget shares the same `type`.
-- Otherwise the row is left as v2 (mixed widgets cannot be expressed
-- in the legacy schema without data loss). For full point-in-time
-- recovery, restore the snapshot taken in the README pre-flight.
--
-- Run:
--   psql "$DATABASE_URL" -f scripts/migrations/2026_07_nested_rows_rollback.sql
-- =====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.is_reducible(v2 jsonb)
RETURNS boolean LANGUAGE sql AS $$
  SELECT
    jsonb_typeof(v2 -> 'columns') = 'array'
    AND jsonb_array_length(v2 -> 'columns') > 0
    AND NOT EXISTS (
      SELECT 1
        FROM jsonb_array_elements(v2 -> 'columns') c
       WHERE jsonb_array_length(c -> 'widgets') <> 1
    )
    AND (
      SELECT count(DISTINCT (c -> 'widgets' -> 0 ->> 'type')) = 1
        FROM jsonb_array_elements(v2 -> 'columns') c
    );
$$;

CREATE OR REPLACE FUNCTION pg_temp.v2_row_to_legacy(v2 jsonb)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  cols       jsonb;
  first_data jsonb;
  rest_data  jsonb;
  legacy     jsonb;
BEGIN
  IF NOT (v2 ? 'schema_version') OR (v2 ->> 'schema_version') <> '2' THEN
    RETURN v2; -- already legacy
  END IF;

  IF NOT pg_temp.is_reducible(v2) THEN
    RETURN v2; -- intentionally preserved (mixed widgets)
  END IF;

  cols := v2 -> 'columns';
  first_data := COALESCE(cols -> 0 -> 'widgets' -> 0 -> 'data', '{}'::jsonb);

  SELECT COALESCE(jsonb_agg(c -> 'widgets' -> 0 -> 'data' ORDER BY ord), '[]'::jsonb)
    INTO rest_data
    FROM jsonb_array_elements(cols) WITH ORDINALITY t(c, ord)
   WHERE ord > 1;

  legacy := jsonb_build_object(
    'id',          v2 ->> 'id',
    'type',        cols -> 0 -> 'widgets' -> 0 ->> 'type',
    'strip_title', v2 ->> 'strip_title',
    'bg_color',    v2 ->> 'bg_color',
    'content',     first_data
  );
  IF v2 ? 'scope'  THEN legacy := legacy || jsonb_build_object('scope',  v2 -> 'scope');  END IF;
  IF v2 ? 'layout' THEN legacy := legacy || jsonb_build_object('layout', v2 -> 'layout'); END IF;
  IF jsonb_array_length(rest_data) > 0 THEN
    legacy := legacy || jsonb_build_object('columns_data', rest_data);
  END IF;

  RETURN legacy;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.rollback_rows_array(arr jsonb)
RETURNS jsonb LANGUAGE sql AS $$
  SELECT COALESCE(jsonb_agg(pg_temp.v2_row_to_legacy(elem) ORDER BY ord), '[]'::jsonb)
    FROM jsonb_array_elements(COALESCE(arr, '[]'::jsonb)) WITH ORDINALITY AS t(elem, ord);
$$;

UPDATE public.site_content SET
  content = jsonb_set(content, '{rows}', pg_temp.rollback_rows_array(content -> 'rows'))
WHERE jsonb_typeof(content -> 'rows') = 'array';

UPDATE public.site_content SET
  draft_content = jsonb_set(draft_content, '{rows}', pg_temp.rollback_rows_array(draft_content -> 'rows'))
WHERE draft_content IS NOT NULL
  AND jsonb_typeof(draft_content -> 'rows') = 'array';

UPDATE public.cms_pages SET
  page_rows = pg_temp.rollback_rows_array(page_rows)
WHERE jsonb_typeof(page_rows) = 'array';

UPDATE public.cms_pages SET
  draft_page_rows = pg_temp.rollback_rows_array(draft_page_rows)
WHERE draft_page_rows IS NOT NULL
  AND jsonb_typeof(draft_page_rows) = 'array';

COMMIT;
