CREATE OR REPLACE FUNCTION public.merge_widget_data_by_type(rows jsonb, target_type text, patch jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      CASE
        WHEN row_elem ? 'columns' THEN
          jsonb_set(row_elem, '{columns}', (
            SELECT COALESCE(jsonb_agg(
              CASE
                WHEN col_elem ? 'cells' THEN
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
                WHEN col_elem ? 'widgets' THEN
                  jsonb_set(col_elem, '{widgets}', (
                    SELECT COALESCE(jsonb_agg(
                      CASE WHEN widget_elem->>'type' = target_type THEN
                        jsonb_set(widget_elem, '{data}', COALESCE(widget_elem->'data', '{}'::jsonb) || patch, true)
                      ELSE widget_elem END
                      ORDER BY w_ord
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(col_elem->'widgets') WITH ORDINALITY AS ww(widget_elem, w_ord)
                  ))
                ELSE col_elem END
              ORDER BY col_ord
            ), '[]'::jsonb)
            FROM jsonb_array_elements(row_elem->'columns') WITH ORDINALITY AS colc(col_elem, col_ord)
          ))
        WHEN row_elem->>'type' = target_type AND row_elem ? 'content' THEN
          jsonb_set(row_elem, '{content}', COALESCE(row_elem->'content', '{}'::jsonb) || patch, true)
        ELSE row_elem
      END
      ORDER BY r_ord
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements(rows) WITH ORDINALITY AS rr(row_elem, r_ord);
$$;

REVOKE EXECUTE ON FUNCTION public.merge_widget_data_by_type(jsonb, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_widget_data_by_type(jsonb, text, jsonb) TO service_role;

COMMENT ON FUNCTION public.merge_widget_data_by_type(jsonb, text, jsonb) IS
  'Merge `patch` into the data/content of every widget matching `target_type` inside a page_rows/draft_page_rows JSONB array, across all 3 historical row schema versions. Everything else is left byte-for-byte untouched. Internal migration utility — not exposed to anon or authenticated roles.';