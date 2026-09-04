-- track-visitor's per-request throttle query (see
-- supabase/functions/track-visitor/index.ts) runs, on every insert:
--
--   WHERE <identity_column> = $1 AND created_at >= now() - interval '60 seconds'
--
-- where <identity_column> is visitor_id when the client has one, and
-- falls back to ip_hash otherwise (first beacon before the client's
-- localStorage-backed visitor_id is minted, or a browser/privacy-mode
-- that strips localStorage entirely). idx_unified_analytics_visitor_id
-- (see 20260418172435) indexes visitor_id but there is no index at all
-- on ip_hash, so every fallback-path insert forces a sequential scan
-- over unified_analytics_logs — a table that grows on every page view
-- and beacon. Mirror that partial index's shape for ip_hash, but
-- include created_at so the throttle query's range filter can be
-- satisfied by an index-only scan instead of a heap fetch per
-- candidate row.
CREATE INDEX idx_unified_analytics_ip_hash_created_at
  ON public.unified_analytics_logs (ip_hash, created_at DESC)
  WHERE ip_hash IS NOT NULL;

-- visitor_id is the PRIMARY dedup key (see the track-visitor file
-- header's "DEDUPLICATION HIERARCHY" section), so this is the throttle
-- path hit on the overwhelming majority of requests — and it has the
-- same shortfall ip_hash just had: idx_unified_analytics_visitor_id only
-- indexes visitor_id, so Postgres still needs a heap fetch per matching
-- row just to evaluate `created_at >= windowStart`. A returning visitor
-- accumulates rows over that visitor_id's entire lifetime (it's a
-- durable localStorage id, not a per-session one), so this scan only
-- gets more expensive over time — the same index-only-scan win applies
-- here, and more of the traffic goes through this path than the
-- ip_hash fallback above. This is an additional, separate index; the
-- existing idx_unified_analytics_visitor_id index is left untouched.
CREATE INDEX idx_unified_analytics_visitor_id_created_at
  ON public.unified_analytics_logs (visitor_id, created_at DESC)
  WHERE visitor_id IS NOT NULL;
