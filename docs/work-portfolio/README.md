# Work portfolio: 21 pieces for /work

Source data: `src/lib/work/entries.ts` (copy) and `src/lib/work/portfolio.ts`
(types, proof points, row building). Tests: `src/lib/work/*.test.ts`.

## Rebuild

```sh
# 1. data for the image scripts
bun scripts/work-portfolio/export-manifest.ts > /tmp/manifest.json
# 2. covers from the owner's Image library (1600x1200 WebP, under 400 KB)
python3 scripts/work-portfolio/make-covers.py /tmp/manifest.json "<Image library>" public
# 3. diagrams (PNG, then convert to diagram.webp) and social cards (og.jpg)
node scripts/work-portfolio/render-images.mjs /tmp/manifest.json public
# 4. SQL for Lovable
bun scripts/work-portfolio/build-sql.ts docs/work-portfolio/work-portfolio-drafts.sql
```

## Loading

`work-portfolio-drafts.sql` inserts every piece with `status = 'draft'` and
the six agreed proof points. Re-running it refreshes drafts only: a piece the
owner has published is never touched. Each piece goes live when the owner
publishes it in Admin, Work.
