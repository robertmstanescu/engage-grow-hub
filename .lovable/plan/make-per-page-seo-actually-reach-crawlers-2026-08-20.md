# Make per-page SEO actually reach crawlers

The audit is correct. Confirmed against the project right now:

- `index.html` ships one hard-coded `<title>`, description, `canonical` and `og:url`, all pointing at `https://themagiccoffin.com/`. Every route serves that same head to any client that does not run JavaScript.
- `brand_settings` in `site_content` contains only `colors` and `typography` — no `identity`, so the edge functions fall through to their `https://example.com` fallback.
- There are **7** published CMS pages (`about-us`, `privacy-policy`, `services`, `services/employee-experience`, `services/fractional-hrbp`, `services/internal-communications`, `services/people-operations`), but `public/sitemap.xml` hard-codes only 5 URLs and misses two service pages plus the `/p/` pages entirely.
- No worker, no rewrite config, nothing that routes bot traffic to `ssr-index`.

## Approach

Prerender real static HTML per route at publish time. Lovable hosting serves a real file at a path before it falls back to the SPA shell, so a crawler requesting `/services/internal-communications/` gets a file whose `<head>` already contains that page's own tags — no worker, no proxy, no stack migration. The React app still boots normally on top of it for humans.

## 1. Build-time prerender of every public route

A new `scripts/prerender-seo.ts` runs as a `postbuild` step (after `vite build`, so it works from the already-hashed production `dist/index.html`):

- Read from the database: published `cms_pages`, published `blog_posts`, and the global SEO row in `site_content`.
- For each route, clone `dist/index.html` and rewrite the head: `<title>`, `meta description`, self-referencing `<link rel="canonical">`, `og:title` / `og:description` / `og:url` / `og:type` / `og:image`, `twitter:*`, and Article JSON-LD for blog posts.
- Write each to its own path — `dist/services/internal-communications/index.html`, `dist/p/about-us/index.html`, `dist/blog/<slug>/index.html`, `dist/blog/index.html`, and the homepage.
- Fall back to sensible per-page defaults (page title + brand) when `meta_title` / `meta_description` are empty, and skip drafts.
- Hard cap the number of generated files (constant, well under hosting limits) so a growing blog can never break a publish.

Because tags are baked at publish time, a metadata edit in the CMS reaches crawlers on the next publish. Per your answer, the plan ends with a full republish of the site.

## 2. Sitemap and llms.txt generated at build time

Same script, same data:

- Write `dist/sitemap.xml` covering the homepage, `/blog/`, every published CMS page at its real path, and every published blog post — always on `https://themagiccoffin.com`.
- Write `dist/llms.txt` from live page content instead of the two-line frozen file.
- Delete the stale `public/sitemap.xml` and `public/llms.txt` so there is exactly one authoritative source.
- `robots.txt`: keep one `Sitemap:` line pointing at `https://themagiccoffin.com/sitemap.xml`, drop the `sitemap.themagiccoffin.com` line.

## 3. Fill in and harden the brand identity

- Write `identity` into the `brand_settings` row: `canonicalOrigin: https://themagiccoffin.com`, `brandName`, `tagline`.
- In `generate-sitemap`, `ssr-index` and `llms-txt`, replace the silent `https://example.com` fallback: `canonicalOrigin` becomes the only production source of truth, and a missing value returns a loud error instead of emitting a sitemap for a domain you do not own. The functions stay available (the admin SSR preview keeps working) but are no longer what crawlers depend on.

## 4. Verify

After publishing: fetch a couple of subpages with JavaScript disabled and confirm the title, description and self-canonical are the page's own — then Google Search Console URL Inspection ("View Crawled Page") and the LinkedIn Post Inspector on a service page.

## Technical notes

- New: `scripts/prerender-seo.ts`; `package.json` gains a `postbuild` hook.
- Deleted: `public/sitemap.xml`, `public/llms.txt`.
- Edited: `public/robots.txt`, the three edge functions' origin resolution, one database row.
- Unchanged: `usePageMeta.ts` and the SEO admin panels keep working exactly as they do now — the prerender reads the same database fields they write.
