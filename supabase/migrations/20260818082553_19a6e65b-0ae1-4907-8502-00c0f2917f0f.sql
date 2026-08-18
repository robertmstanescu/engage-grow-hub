
UPDATE public.site_content
SET content = replace(
      replace(content::text, '"#internal-communications"', '"/services/internal-communications"'),
      '"#employee-experience"', '"/services/employee-experience"'
    )::jsonb,
    updated_at = now()
WHERE section_key = 'navbar';
