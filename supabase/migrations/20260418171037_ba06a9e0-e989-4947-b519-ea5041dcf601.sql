-- 1. Add AI summary fields
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS ai_summary text;
ALTER TABLE public.cms_pages  ADD COLUMN IF NOT EXISTS ai_summary text;

-- 2. AI crawler activity log
CREATE TABLE IF NOT EXISTS public.ai_crawler_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_name    text NOT NULL,
  user_agent  text NOT NULL,
  page_path   text NOT NULL,
  source      text NOT NULL DEFAULT 'server', -- 'server' | 'client'
  ip_hash     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_crawler_logs_created_at ON public.ai_crawler_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_crawler_logs_bot_name   ON public.ai_crawler_logs (bot_name);

ALTER TABLE public.ai_crawler_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read everything
CREATE POLICY "Admins can read crawler logs"
  ON public.ai_crawler_logs FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Service role full access (used by edge functions)
CREATE POLICY "Service role manages crawler logs"
  ON public.ai_crawler_logs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');