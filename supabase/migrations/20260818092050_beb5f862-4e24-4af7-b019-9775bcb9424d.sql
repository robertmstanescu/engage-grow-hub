UPDATE site_content
SET content = replace(
      replace(
        replace(content::text, '"color_card_body": "#4D1B5E"', '"color_card_body": ""'),
        '"color_card_title": "#2A0E33"', '"color_card_title": ""'),
      '<span style="color: rgb(77, 27, 94);">Our services</span>', 'Our services')::jsonb
WHERE section_key = 'page_rows';