# Republish the site with fresh sitemap and llms.txt

You made content changes (via Claude) and want the sitemap, llms.txt and related files refreshed, then the site republished.

## What already happens automatically

The build runs `scripts/prerender-seo.mjs` as a `postbuild` step. It reads the live database (published CMS pages, published blog posts, brand settings) and rewrites:

- `public/sitemap.xml` — every published page and post on `https://themagiccoffin.com`
- `public/llms.txt` — the AI-crawler manifest
- Prerendered per-route HTML with each page's own title, description, canonical and social tags

So no manual sitemap or llms.txt editing is needed — a fresh build + publish regenerates them from your current content.

## Steps

1. **Confirm your content changes are live in the database** — verify the pages/posts you edited are in their published state (drafts are not picked up by the prerender). If anything is still a draft, publish it from the admin first.
2. **Run the production build** — this regenerates `sitemap.xml`, `llms.txt` and the prerendered page heads from the latest content.
3. **Spot-check the output** — confirm the sitemap lists the changed pages and llms.txt reflects the new content.
4. **Publish the site** — deploy so crawlers and visitors get the updated pages and files.

## Notes

- No code changes are involved; this is a regenerate-and-publish task.
- If any of your Claude-made changes are still sitting as drafts, tell me which pages and I'll publish that content first so it reaches the sitemap.
