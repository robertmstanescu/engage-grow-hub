-- Internal settings for server-to-server auth (cron → edge function shared secret).
-- No client should ever read this table — RLS denies everyone; only the
-- service_role and SECURITY DEFINER functions can access it.
CREATE TABLE IF NOT EXISTS public.internal_settings (
  key   text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages internal settings"
  ON public.internal_settings FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

INSERT INTO public.internal_settings (key, value)
VALUES ('publish_scheduled_cron_secret',
        'ceacb2752a5ea76c497e8adf4fa5badb5d395796ff061a8b13ed845bef9e973d')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();