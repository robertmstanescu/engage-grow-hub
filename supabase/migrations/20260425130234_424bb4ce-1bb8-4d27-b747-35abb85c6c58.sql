-- ════════════════════════════════════════════════════════════════════
-- US 1.2 — Eager migration of all rows to v3 cell-aware shape
-- ════════════════════════════════════════════════════════════════════
--
-- Mirrors the TypeScript migrateRowToV3 helper in src/types/rows.ts.
-- Idempotent: rows already at schema_version=3 pass through untouched.
-- Lossless: every widget keeps its id, type and data; v1 rows have
-- their `content` (+ any `columns_data`) wrapped into single-cell
-- columns; v2 rows have each column's widgets[] wrapped into one cell.

CREATE OR REPLACE FUNCTION public._mig_v3_default_cell_layout()
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_build_object(
    'direction','vertical','verticalAlign','top','justify','stretch',
    'gap',24,'paddingTop',0,'paddingRight',0,'paddingBottom',0,'paddingLeft',0,
    'minHeight',0
  )
$$;

CREATE OR REPLACE FUNCTION public._mig_v3_default_cell_style()
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_build_object(
    'bgColor','','borderRadius',0,'borderColor','','borderWidth',0,
    'customClass','','customCss',''
  )
$$;

CREATE OR REPLACE FUNCTION public._mig_v3_build_cell(_widgets jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_build_object(
    'id', gen_random_uuid()::text,
    'layout', public._mig_v3_default_cell_layout(),
    'style',  public._mig_v3_default_cell_style(),
    'span',   jsonb_build_object('col',1,'row',1),
    'widgets', COALESCE(_widgets, '[]'::jsonb)
  )
$$;

-- Promote a single legacy v1 column blob to a v2-style PageWidget.
CREATE OR REPLACE FUNCTION public._mig_v3_v1_widget(_type text, _data jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_build_object(
    'id', gen_random_uuid()::text,
    'type', _type,
    'data', COALESCE(_data, '{}'::jsonb)
  )
$$;

-- Migrate ONE row of any shape (v1/v2/v3) to v3.
CREATE OR REPLACE FUNCTION public._mig_v3_row(_row jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v3_columns jsonb := '[]'::jsonb;
  col_widths jsonb;
  contents jsonb;
  i int;
  c jsonb;
BEGIN
  IF _row IS NULL THEN RETURN _row; END IF;

  -- Already v3 → idempotent passthrough.
  IF (_row->>'schema_version') = '3' THEN
    RETURN _row;
  END IF;

  -- v2 → wrap each column's widgets[] into one cell.
  IF (_row->>'schema_version') = '2' AND jsonb_typeof(_row->'columns') = 'array' THEN
    FOR c IN SELECT * FROM jsonb_array_elements(_row->'columns') LOOP
      v3_columns := v3_columns || jsonb_build_array(
        jsonb_build_object(
          'id', COALESCE(c->>'id', gen_random_uuid()::text),
          'cell_direction', COALESCE(c->>'cell_direction','vertical'),
          'cells', jsonb_build_array(public._mig_v3_build_cell(COALESCE(c->'widgets','[]'::jsonb)))
        )
      );
    END LOOP;
    RETURN _row
      || jsonb_build_object('schema_version', 3)
      || jsonb_build_object('columns', v3_columns);
  END IF;

  -- v1 → fold `content` + `columns_data[]` into one column each, single cell.
  contents := jsonb_build_array(COALESCE(_row->'content','{}'::jsonb));
  IF jsonb_typeof(_row->'columns_data') = 'array' THEN
    contents := contents || (_row->'columns_data');
  END IF;

  FOR i IN 0 .. (jsonb_array_length(contents) - 1) LOOP
    v3_columns := v3_columns || jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid()::text,
        'cell_direction', 'vertical',
        'cells', jsonb_build_array(public._mig_v3_build_cell(
          jsonb_build_array(public._mig_v3_v1_widget(
            COALESCE(_row->>'type','text'),
            contents->i
          ))
        ))
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'id', COALESCE(_row->>'id', gen_random_uuid()::text),
    'schema_version', 3,
    'strip_title', COALESCE(_row->>'strip_title',''),
    'bg_color',    COALESCE(_row->>'bg_color',''),
    'scope',       _row->>'scope',
    'layout',      _row->'layout',
    'column_layout', 'custom',
    'columns',     v3_columns,
    'customCss',   _row->>'customCss'
  );
END;
$$;

-- Migrate an entire rows[] jsonb array.
CREATE OR REPLACE FUNCTION public._mig_v3_rows(_rows jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(
    (SELECT jsonb_agg(public._mig_v3_row(elem))
       FROM jsonb_array_elements(_rows) AS elem),
    '[]'::jsonb
  )
$$;

-- ── Apply to site_content (rows live under content.rows / draft_content.rows) ──
UPDATE public.site_content
   SET content = jsonb_set(content, '{rows}', public._mig_v3_rows(content->'rows'))
 WHERE jsonb_typeof(content->'rows') = 'array';

UPDATE public.site_content
   SET draft_content = jsonb_set(draft_content, '{rows}', public._mig_v3_rows(draft_content->'rows'))
 WHERE jsonb_typeof(draft_content->'rows') = 'array';

-- ── Apply to cms_pages ──
UPDATE public.cms_pages
   SET page_rows = public._mig_v3_rows(page_rows)
 WHERE jsonb_typeof(page_rows) = 'array';

UPDATE public.cms_pages
   SET draft_page_rows = public._mig_v3_rows(draft_page_rows)
 WHERE jsonb_typeof(draft_page_rows) = 'array';

-- ── Apply to blog_posts ──
UPDATE public.blog_posts
   SET page_rows = public._mig_v3_rows(page_rows)
 WHERE jsonb_typeof(page_rows) = 'array';

UPDATE public.blog_posts
   SET draft_page_rows = public._mig_v3_rows(draft_page_rows)
 WHERE jsonb_typeof(draft_page_rows) = 'array';

-- Cleanup helpers (one-shot — safe to drop after migration).
DROP FUNCTION public._mig_v3_rows(jsonb);
DROP FUNCTION public._mig_v3_row(jsonb);
DROP FUNCTION public._mig_v3_v1_widget(text, jsonb);
DROP FUNCTION public._mig_v3_build_cell(jsonb);
DROP FUNCTION public._mig_v3_default_cell_style();
DROP FUNCTION public._mig_v3_default_cell_layout();