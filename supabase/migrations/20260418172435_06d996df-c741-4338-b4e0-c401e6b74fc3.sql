-- 1. Create the new unified table
CREATE TABLE public.unified_analytics_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_bot boolean NOT NULL DEFAULT false,
  entity_name text NOT NULL DEFAULT 'Human',
  path text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  referrer text,
  search_engine text,
  browser text,
  device text,
  country text,
  duration_seconds integer,
  scroll_depth integer,
  visitor_id text,
  stitched_email text,
  user_agent text NOT NULL DEFAULT '',
  ip_hash text,
  source text NOT NULL DEFAULT 'server',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_unified_analytics_created_at ON public.unified_analytics_logs (created_at DESC);
CREATE INDEX idx_unified_analytics_is_bot ON public.unified_analytics_logs (is_bot, created_at DESC);
CREATE INDEX idx_unified_analytics_visitor_id ON public.unified_analytics_logs (visitor_id) WHERE visitor_id IS NOT NULL;
CREATE INDEX idx_unified_analytics_entity ON public.unified_analytics_logs (entity_name);
CREATE INDEX idx_unified_analytics_country ON public.unified_analytics_logs (country) WHERE country IS NOT NULL;

-- 2. Migrate existing crawler-log rows into the new table
INSERT INTO public.unified_analytics_logs (
  is_bot, entity_name, path, category, user_agent, ip_hash, source, created_at
)
SELECT
  true,
  bot_name,
  page_path,
  CASE
    WHEN page_path LIKE '/blog/%' THEN 'blog'
    WHEN page_path LIKE '/p/%' THEN 'page'
    WHEN page_path IN ('/llms.txt', '/llms-full.txt') THEN 'manifest'
    ELSE 'other'
  END,
  user_agent,
  ip_hash,
  source,
  created_at
FROM public.ai_crawler_logs;

-- 3. Drop the old table now that data is migrated
DROP TABLE public.ai_crawler_logs CASCADE;

-- 4. RLS
ALTER TABLE public.unified_analytics_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read analytics logs"
  ON public.unified_analytics_logs FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role manages analytics logs"
  ON public.unified_analytics_logs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 5. Helper RPC: stitch a visitor's anonymous logs to an email after lead capture.
CREATE OR REPLACE FUNCTION public.stitch_visitor_to_email(
  _visitor_id text,
  _email text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  IF _visitor_id IS NULL OR length(_visitor_id) = 0 THEN
    RETURN 0;
  END IF;
  IF _email IS NULL OR length(_email) = 0 THEN
    RETURN 0;
  END IF;

  UPDATE public.unified_analytics_logs
     SET stitched_email = _email
   WHERE visitor_id = _visitor_id
     AND (stitched_email IS NULL OR stitched_email = '');

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

REVOKE ALL ON FUNCTION public.stitch_visitor_to_email(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.stitch_visitor_to_email(text, text) TO service_role;