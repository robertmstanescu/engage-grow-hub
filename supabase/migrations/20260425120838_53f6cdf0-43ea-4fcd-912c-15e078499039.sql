-- Epic 4 / US 4.3 — Lead scoring & enrichment columns on contacts.
-- ai_score: 0–100 (NULL = not yet scored). The UI buckets the value
--   into Hot (≥75), Warm (40–74), Cold (<40) for the badge.
-- linkedin_url: enriched LinkedIn profile URL surfaced as a clickable
--   icon next to the contact's name for rapid manual vetting.
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS ai_score smallint
    CHECK (ai_score IS NULL OR (ai_score >= 0 AND ai_score <= 100)),
  ADD COLUMN IF NOT EXISTS linkedin_url text;

-- Partial index so "Sort by Highest Intent" is fast even with many rows
-- and unscored leads don't bloat the index.
CREATE INDEX IF NOT EXISTS contacts_ai_score_desc_idx
  ON public.contacts (ai_score DESC NULLS LAST)
  WHERE ai_score IS NOT NULL;