ALTER TABLE public.unified_analytics_logs
  ADD COLUMN IF NOT EXISTS view_id text,
  ADD COLUMN IF NOT EXISTS engaged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS country_source text;
CREATE INDEX IF NOT EXISTS unified_analytics_logs_view_id_idx ON public.unified_analytics_logs (view_id);
CREATE INDEX IF NOT EXISTS unified_analytics_logs_ip_ua_created_idx ON public.unified_analytics_logs (ip_hash, created_at DESC);