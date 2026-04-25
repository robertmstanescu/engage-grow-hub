-- Epic 4 / US 4.1 — Persistent revenue attribution
--
-- One JSONB column per table is the right shape here:
--   • Schema flexibility: campaign tooling adds new tracking params every
--     quarter (msclkid, ttclid, li_fat_id, …). A relational layout would
--     need a migration each time; JSONB doesn't.
--   • Sparse data: most rows will only have 2-3 of the keys. Wide-column
--     storage would waste space on NULLs.
--   • Easy to query: GIN index lets us still filter by ?->>'utm_campaign'
--     fast enough for the dashboards.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS attribution jsonb;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS attribution jsonb;

ALTER TABLE public.unified_analytics_logs
  ADD COLUMN IF NOT EXISTS attribution jsonb;

-- GIN indexes for filtering by any key inside the JSONB blob. We use
-- `jsonb_path_ops` because we only ever do `?` / `?|` / `@>` queries
-- against these columns — that op-class is ~3x smaller than the default.
CREATE INDEX IF NOT EXISTS idx_leads_attribution
  ON public.leads USING GIN (attribution jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_contacts_attribution
  ON public.contacts USING GIN (attribution jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_analytics_attribution
  ON public.unified_analytics_logs USING GIN (attribution jsonb_path_ops);

COMMENT ON COLUMN public.leads.attribution IS
  'Marketing attribution captured on first landing: utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid, fbclid, landing_path, first_seen_at, referrer.';
COMMENT ON COLUMN public.contacts.attribution IS
  'Marketing attribution captured on first landing: utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid, fbclid, landing_path, first_seen_at, referrer.';
COMMENT ON COLUMN public.unified_analytics_logs.attribution IS
  'Marketing attribution snapshot present on the analytics beacon at the time of the page view.';