/**
 * Print the Work portfolio as JSON for the image renderer.
 *
 *   bun scripts/work-portfolio/export-manifest.ts > /tmp/manifest.json
 *
 * Plain data only: slug, pillar, type, title, honesty label, the cover
 * source and the diagram spec. Nothing here talks to Supabase.
 */
import { WORK_PORTFOLIO } from "../../src/lib/work/entries";

const manifest = WORK_PORTFOLIO.map((e) => ({
  n: e.n,
  slug: e.slug,
  pillar: e.pillar,
  type: e.type,
  title: e.title,
  honestyLabel: e.honestyLabel,
  cover: e.cover,
  diagram: e.diagram,
}));
process.stdout.write(JSON.stringify(manifest, null, 2));
