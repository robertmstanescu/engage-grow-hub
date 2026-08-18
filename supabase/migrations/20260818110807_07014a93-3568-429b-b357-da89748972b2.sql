UPDATE site_content
SET content = replace(content::text, '"bgColor": "#E8E8E8"', '"bgColor": ""')::jsonb,
    draft_content = CASE WHEN draft_content IS NULL THEN NULL ELSE replace(draft_content::text, '"bgColor": "#E8E8E8"', '"bgColor": ""')::jsonb END
WHERE section_key = 'page_rows';

UPDATE site_content
SET content = replace(content::text, '"bgColor":"#E8E8E8"', '"bgColor":""')::jsonb,
    draft_content = CASE WHEN draft_content IS NULL THEN NULL ELSE replace(draft_content::text, '"bgColor":"#E8E8E8"', '"bgColor":""')::jsonb END
WHERE section_key = 'page_rows';