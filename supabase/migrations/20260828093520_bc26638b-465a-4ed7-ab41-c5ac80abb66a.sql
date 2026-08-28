CREATE OR REPLACE FUNCTION public.merge_widget_data_by_type(rows jsonb, target_type text, patch jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    jsonb_agg(
      CASE
        -- v2/v3: row owns `columns` — walk into it.
        WHEN row_elem ? 'columns' THEN
          jsonb_set(row_elem, '{columns}', (
            SELECT COALESCE(jsonb_agg(
              CASE
                -- v3: column owns `cells`, each cell owns `widgets`.
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
                -- v2 legacy: column owns `widgets` directly, no cells.
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
        -- v1 legacy: the row itself is a flat {type, content} widget.
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

COMMENT ON FUNCTION public.merge_widget_data_by_type(jsonb, text, jsonb) IS
  'Merge `patch` into the data/content of every widget matching `target_type` inside a page_rows/draft_page_rows JSONB array, across all 3 historical row schema versions. Everything else is left byte-for-byte untouched. Use this instead of hand-rolling a recursive jsonb walk for any future content migration — see the equivalent src/lib/rowWidgets.ts helper for application code.';