-- Epic 4 / US 4.4 — Zero-Party Data column for progressive profiling.
-- Stores arbitrary key/value answers collected from interactive
-- assessments, ROI calculators, and quizzes. The shape is intentionally
-- open: marketing can ship new questions without a migration.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS zero_party_data jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS zero_party_data jsonb NOT NULL DEFAULT '{}'::jsonb;

-- GIN indexes power containment queries like
--   WHERE zero_party_data @> '{"industry":"saas"}'
-- without a sequential scan once the table grows.
CREATE INDEX IF NOT EXISTS leads_zero_party_data_gin
  ON public.leads USING gin (zero_party_data);

CREATE INDEX IF NOT EXISTS contacts_zero_party_data_gin
  ON public.contacts USING gin (zero_party_data);