-- Analytics path normalization backfill.
--
-- `/services/foo` and `/services/foo/` are the same page, but
-- `track-visitor` previously stored the client's `pagePath` verbatim, so
-- a mix of trailing-slash and non-trailing-slash beacons for one page
-- fragmented into separate `path` values (visible e.g. in the "Pages"
-- table and the Converted Journeys panel). The edge function now
-- normalizes on write to ALWAYS end in a trailing slash — matching
-- `ensureTrailingSlash` in `src/hooks/usePageMeta.ts`, which is this
-- site's one established canonical-URL convention (every
-- `<link rel="canonical">` is built that way, and both
-- `public/sitemap.xml` and `public/llms.txt` already list every page
-- with a trailing slash). This backfill applies the same normalization
-- to already-stored rows so historical data groups correctly too.
--
-- `/llms.txt` and `/llms-full.txt` rows are excluded: those are written
-- directly by the `llms-txt` edge function (not through track-visitor's
-- normalizePath) as literal, no-trailing-slash paths, and category is
-- already hardcoded 'manifest' for them.
--
-- `category` is recomputed alongside `path` because it's a prefix match
-- on it — e.g. a bare "/blog" hit (no slug) becomes "/blog/", which now
-- correctly matches the "/blog/%" prefix and (re)classifies as 'blog'
-- instead of 'other', the same category a "/blog/some-post/" hit already
-- gets.
UPDATE public.unified_analytics_logs
SET
  path = path || '/',
  category = CASE
    WHEN (path || '/') LIKE '/blog/%' THEN 'blog'
    WHEN (path || '/') LIKE '/p/%' THEN 'page'
    ELSE 'other'
  END
WHERE path NOT LIKE '%/'
  AND path NOT IN ('/llms.txt', '/llms-full.txt');