CREATE OR REPLACE FUNCTION public.convert_band_tones(doc jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  result jsonb;
  k text;
  v jsonb;
  elem jsonb;
  tone text;
BEGIN
  IF doc IS NULL THEN RETURN NULL; END IF;

  IF jsonb_typeof(doc) = 'array' THEN
    result := '[]'::jsonb;
    FOR elem IN SELECT * FROM jsonb_array_elements(doc) LOOP
      result := result || jsonb_build_array(public.convert_band_tones(elem));
    END LOOP;
    RETURN result;
  END IF;

  IF jsonb_typeof(doc) <> 'object' THEN RETURN doc; END IF;

  result := '{}'::jsonb;
  FOR k, v IN SELECT * FROM jsonb_each(doc) LOOP
    result := result || jsonb_build_object(k, public.convert_band_tones(v));
  END LOOP;

  IF result ? 'layout' AND jsonb_typeof(result->'layout') = 'object'
     AND (result->'layout') ? 'bandTone' THEN
    tone := result->'layout'->>'bandTone';
    IF COALESCE(result->>'bg_color', '') = '' THEN
      IF tone = 'white' THEN
        result := jsonb_set(result, '{bg_color}', '"#FFFFFF"'::jsonb, true);
      ELSIF tone = 'tint' THEN
        result := jsonb_set(result, '{bg_color}', '"#F4ECF6"'::jsonb, true);
      ELSIF tone = 'deep' THEN
        result := jsonb_set(result, '{bg_color}', '"#2B0E33"'::jsonb, true);
      END IF;
    END IF;
    result := jsonb_set(result, '{layout}', (result->'layout') - 'bandTone', true);
  END IF;

  RETURN result;
END;
$$;

UPDATE public.site_content
SET content = public.convert_band_tones(content)
WHERE content::text LIKE '%bandTone%';

UPDATE public.site_content
SET draft_content = public.convert_band_tones(draft_content)
WHERE draft_content::text LIKE '%bandTone%';

DROP FUNCTION public.convert_band_tones(jsonb);