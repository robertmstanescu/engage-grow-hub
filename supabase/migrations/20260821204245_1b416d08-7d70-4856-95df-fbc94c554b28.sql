UPDATE public.site_content
SET content = jsonb_set(content, '{identity,canonicalOrigin}', '"https://themagiccoffin.com"'::jsonb, true)
WHERE section_key = 'brand_settings';