UPDATE public.site_content
SET content = replace(replace(replace(replace(content::text,
      'rgb(255, 255, 255)', 'rgb(38, 20, 46)'),
      'rgb(255,255,255)', 'rgb(38, 20, 46)'),
      '#FFFFFF', '#26142E'),
      '#ffffff', '#26142E')::jsonb
WHERE content::text ~ '(rgb\(255, ?255, ?255\)|#[Ff]{6}|#ffffff)';

UPDATE public.site_content
SET draft_content = replace(replace(replace(replace(draft_content::text,
      'rgb(255, 255, 255)', 'rgb(38, 20, 46)'),
      'rgb(255,255,255)', 'rgb(38, 20, 46)'),
      '#FFFFFF', '#26142E'),
      '#ffffff', '#26142E')::jsonb
WHERE draft_content IS NOT NULL AND draft_content::text ~ '(rgb\(255, ?255, ?255\)|#[Ff]{6}|#ffffff)';