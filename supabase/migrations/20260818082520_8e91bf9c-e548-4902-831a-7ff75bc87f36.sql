
-- 1. Create the two service pages from the homepage rows
WITH src AS (
  SELECT r->>'strip_title' AS name, r AS row
  FROM public.site_content, jsonb_array_elements(content->'rows') r
  WHERE section_key = 'page_rows'
    AND r->>'strip_title' IN ('Internal Communications','Employee Experience')
), prepped AS (
  SELECT
    CASE name WHEN 'Internal Communications' THEN 'services/internal-communications'
              ELSE 'services/employee-experience' END AS slug,
    name AS title,
    jsonb_build_array(
      jsonb_set(
        jsonb_set(row, '{layout,bandTone}', '"white"'::jsonb, true),
        '{layout,snapEnabled}', 'false'::jsonb, true
      )
    ) AS page_rows
  FROM src
)
INSERT INTO public.cms_pages (slug, title, template_type, page_rows, status, meta_title, meta_description)
SELECT slug, title, 'blank', page_rows, 'published',
       title || ' — The Magic Coffin',
       'Consulting, retainers and fractional support for ' || lower(title) || '.'
FROM prepped
ON CONFLICT (slug) DO UPDATE
  SET page_rows = EXCLUDED.page_rows, status = 'published', updated_at = now();

-- 2. Services overview page
INSERT INTO public.cms_pages (slug, title, template_type, page_rows, status, meta_title, meta_description)
VALUES (
  'services', 'Services', 'blank',
  jsonb_build_array(jsonb_build_object(
    'id', 'row_services_index',
    'strip_title', 'Services',
    'schema_version', 3,
    'column_layout', '100',
    'layout', jsonb_build_object('columns',1,'bandTone','tint','alignment','center','fullWidth',false,
              'paddingTop',64,'paddingBottom',64,'snapEnabled',false,'verticalAlign','middle',
              'marginTop',0,'marginBottom',0),
    'columns', jsonb_build_array(jsonb_build_object(
      'id','col_services_index','cell_direction','vertical',
      'cells', jsonb_build_array(jsonb_build_object(
        'id','cell_services_index',
        'span', jsonb_build_object('col',1,'row',1),
        'style', jsonb_build_object('bgColor','','customCss','','borderColor','','borderWidth',0,'customClass','','borderRadius',0),
        'layout', jsonb_build_object('gap',24,'justify','stretch','direction','vertical','minHeight',0,
                  'paddingTop',0,'paddingLeft',0,'paddingRight',0,'paddingBottom',0,'verticalAlign','top'),
        'widgets', jsonb_build_array(jsonb_build_object(
          'id','widget_services_index','type','boxed',
          'data', jsonb_build_object(
            'title_lines', jsonb_build_array('Services'),
            'cards', jsonb_build_array(
              jsonb_build_object('title','Internal Communications','icon','lucide:Building2',
                'body','<p>Audits, strategy and fractional leadership for internal comms that actually lands.</p>',
                'link_url','/services/internal-communications'),
              jsonb_build_object('title','Employee Experience','icon','lucide:Star',
                'body','<p>Journeys, onboarding and listening systems designed around real people.</p>',
                'link_url','/services/employee-experience')
            )
          )
        ))
      ))
    ))
  )),
  'published', 'Services — The Magic Coffin',
  'Internal communications and employee experience consulting, retainers and fractional support.'
)
ON CONFLICT (slug) DO UPDATE SET page_rows = EXCLUDED.page_rows, status = 'published', updated_at = now();

-- 3. Drop the two long rows from the homepage and relink the Our Services boxes
UPDATE public.site_content
SET content = jsonb_set(
      content, '{rows}',
      (
        SELECT COALESCE(jsonb_agg(
          CASE WHEN r->>'strip_title' = 'Our Services' THEN
            replace(
              replace(r::text, '"#internal-communications"', '"/services/internal-communications"'),
              '"#employee-experience"', '"/services/employee-experience"'
            )::jsonb
          ELSE r END
          ORDER BY ord
        ), '[]'::jsonb)
        FROM jsonb_array_elements(content->'rows') WITH ORDINALITY AS t(r, ord)
        WHERE r->>'strip_title' NOT IN ('Internal Communications','Employee Experience')
      )
    ),
    updated_at = now()
WHERE section_key = 'page_rows';
