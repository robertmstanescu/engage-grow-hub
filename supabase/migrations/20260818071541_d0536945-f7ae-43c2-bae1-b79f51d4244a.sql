UPDATE public.site_content
SET content = replace(replace(replace(content::text, '#F9F0C1', '#7A5C12'), '#EAD06E', '#7A5C12'), '#F4F0EC', '#7A5C12')::jsonb
WHERE content::text ~ '(#F9F0C1|#EAD06E|#F4F0EC)';

UPDATE public.site_content
SET draft_content = replace(replace(replace(draft_content::text, '#F9F0C1', '#7A5C12'), '#EAD06E', '#7A5C12'), '#F4F0EC', '#7A5C12')::jsonb
WHERE draft_content IS NOT NULL AND draft_content::text ~ '(#F9F0C1|#EAD06E|#F4F0EC)';