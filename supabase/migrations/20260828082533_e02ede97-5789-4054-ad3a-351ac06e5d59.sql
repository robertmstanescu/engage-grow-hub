-- Analytics CMS-page alias backfill.
--
-- CmsPage is mounted at THREE route patterns that can render the same
-- content (`/services/:slug`, `/p/:slug`, and a bare `/:slug` catch-all)
-- — see `cmsPagePath()` in src/pages/CmsPage.tsx / scripts/prerender-seo.mjs.
-- So `/about-us/` and `/p/about-us/` are the same page under different
-- URLs, the same duplication problem as the trailing-slash one fixed by
-- the previous migration, just via a different route instead of a
-- missing slash. `track-visitor` now resolves the bare-slug alias to its
-- canonical `/p/<slug>/` location on write (verifying the slug is a real
-- `cms_pages` row first, so a dead/typo'd bare URL doesn't get
-- mislabeled as a real page). This backfill applies the same resolution
-- to already-stored rows.
--
-- Only single-segment paths are touched — the bare route can only ever
-- match ONE path segment (`:slug` isn't a splat), so anything with more
-- segments already went through a more specific route and is already at
-- its canonical location. The join against `cms_pages.slug` is what
-- keeps this precise: a row is only rewritten when the slug matches a
-- REAL page, so garbage/typo'd single-segment hits (which render
-- CmsPage's own not-found state, not a real page) stay bucketed as
-- 'other' instead of being counted as a page view.
UPDATE public.unified_analytics_logs l
SET
  path = '/p/' || cp.slug || '/',
  category = 'page'
FROM public.cms_pages cp
WHERE l.path ~ '^/[^/]+/$'
  AND cp.slug = substring(l.path from 2 for length(l.path) - 2)
  AND cp.slug NOT IN ('blog', 'admin', 'unsubscribe', 'api', 'auth', 'login', 'signup', 'p', 'services');
