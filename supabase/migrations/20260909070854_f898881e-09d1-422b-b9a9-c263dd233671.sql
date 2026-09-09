CREATE TABLE IF NOT EXISTS public.integration_settings (
  id text PRIMARY KEY,
  secret jsonb,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_settings TO service_role;

ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.integration_settings IS 'Search-engine credentials (service role only). id: google_search_console | bing_webmaster.';