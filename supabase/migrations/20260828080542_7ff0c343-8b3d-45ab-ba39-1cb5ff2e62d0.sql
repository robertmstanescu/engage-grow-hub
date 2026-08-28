-- Analytics path normalization backfill.
--
-- `/services` and `/services/` are the same page, but `track-visitor`
-- previously stored the client's `pagePath` verbatim, so a mix of
-- trailing-slash and non-trailing-slash beacons for one page fragmented
-- into separate `path` values (visible e.g. in the Converted Journeys
-- panel). The edge function now normalizes on write — single leading
-- slash, no trailing slash except root "/" — matching the convention
-- already used for the `redirects` table (`src/lib/redirectPaths.ts`).
-- This backfill applies the same normalization to already-stored rows so
-- historical data groups correctly too.
--
-- `category` is recomputed alongside `path` because it's a prefix match
-- on it — e.g. a bare "/blog/" hit trims to "/blog", which no longer
-- matches the "/blog/%" blog-post prefix and reclassifies to "other",
-- the same category a fresh "/blog" beacon already gets today.
UPDATE public.unified_analytics_logs
SET
  path = regexp_replace(path, '/+$', ''),
  category = CASE
    WHEN regexp_replace(path, '/+$', '') LIKE '/blog/%' THEN 'blog'
    WHEN regexp_replace(path, '/+$', '') LIKE '/p/%' THEN 'page'
    WHEN regexp_replace(path, '/+$', '') IN ('/llms.txt', '/llms-full.txt') THEN 'manifest'
    ELSE 'other'
  END
WHERE path <> '/' AND path LIKE '%/';
