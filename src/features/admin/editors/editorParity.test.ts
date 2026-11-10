/**
 * Editor parity: every option an editor offers must be read by the block
 * that draws it, so the admin and the site never disagree.
 *
 * The test reads each editor's source, collects the field names it
 * writes (`onChange("field", …)`, `updateService(i, "field", …)` and the
 * like) and checks that the renderer's source reads the same name. A
 * field with no reader is a control that does nothing: remove it, or make
 * the block draw it.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "src/features");

const read = (path: string): string => {
  const full = join(ROOT, path);
  if (statSync(full).isDirectory()) {
    return readdirSync(full)
      .filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f))
      .map((f) => readFileSync(join(full, f), "utf8"))
      .join("\n");
  }
  return readFileSync(full, "utf8");
};

/** One exported component out of a file that holds several. */
const component = (path: string, name: string): string => {
  const src = read(path);
  const start = src.indexOf(`export const ${name}`);
  if (start < 0) throw new Error(`${name} not found in ${path}`);
  const next = src.indexOf("\nexport const ", start + 10);
  return src.slice(start, next < 0 ? undefined : next);
};

const WRITES = /\b(?:on[A-Z]\w*|update\w*|patch\w*)\(\s*(?:\w+\s*,\s*)?"([A-Za-z_]+)"/g;
const fieldsOf = (src: string): string[] => [...new Set([...src.matchAll(WRITES)].map((m) => m[1]))].sort();

/** Parts every block shares: heading block, notes, cover card, section frame. */
const SHARED = ["site/rows/typography", "site/rows/RowRenderer.tsx", "site/RowCoverCard.tsx", "site/rows/RowCoverImage.tsx"].map(read).join("\n");

const NEW = "admin/editors/NewRowEditors.tsx";
const PAIRS: Record<string, { editor: string; renderer: string[] }> = {
  hero: { editor: read("admin/site-editor/HeroEditor.tsx"), renderer: ["site/rows/HeroRow.tsx", "site/HeroSection.tsx"] },
  service: { editor: read("admin/site-editor/PillarEditor.tsx"), renderer: ["site/rows/ServiceRow.tsx", "site/TierCard.tsx"] },
  image_text: { editor: read("admin/site-editor/ImageTextEditor.tsx"), renderer: ["site/rows/ImageTextRow.tsx"] },
  profile: { editor: read("admin/site-editor/ProfileEditor.tsx"), renderer: ["site/rows/ProfileRow.tsx"] },
  grid: { editor: read("admin/site-editor/GridEditor.tsx"), renderer: ["site/rows/GridRow.tsx"] },
  text: { editor: read("admin/site-editor/TextRowEditor.tsx"), renderer: ["site/rows/TextRow.tsx"] },
  contact: { editor: read("widgets/contact/ContactAdmin.tsx"), renderer: ["site/rows/ContactRow.tsx", "widgets/contact/ContactFrontend.tsx"] },
  from_the_blog: { editor: read("widgets/from_the_blog/FromTheBlogAdmin.tsx"), renderer: ["widgets/from_the_blog/FromTheBlogRow.tsx"] },
  work_teaser: { editor: read("widgets/work_teaser/WorkTeaserAdmin.tsx"), renderer: ["widgets/work_teaser/WorkTeaserRow.tsx", "site/WorkCard.tsx"] },
  world_map: { editor: read("widgets/world_map/WorldMapEditor.tsx"), renderer: ["widgets/world_map/WorldMapRow.tsx", "widgets/world_map/WorldMapArt.tsx", "widgets/world_map/resolve.ts"] },
  logo_cloud: { editor: component(NEW, "LogoCloudEditor"), renderer: ["site/rows/LogoCloudRow.tsx"] },
  testimonial: { editor: component(NEW, "TestimonialEditor"), renderer: ["site/rows/TestimonialRow.tsx"] },
  faq: { editor: component(NEW, "FaqEditor"), renderer: ["site/rows/FaqRow.tsx"] },
  proof_band: { editor: component(NEW, "ProofBandEditor"), renderer: ["site/rows/ProofBandRow.tsx"] },
  process_steps: { editor: component(NEW, "ProcessStepsEditor"), renderer: ["site/rows/ProcessStepsRow.tsx"] },
  quote_band: { editor: component(NEW, "QuoteBandEditor"), renderer: ["site/rows/QuoteBandRow.tsx"] },
  cta_band: { editor: component(NEW, "CtaBandEditor"), renderer: ["site/rows/CtaBandRow.tsx"] },
};

describe("editor parity: every editor option is read by its block", () => {
  for (const [type, { editor, renderer }] of Object.entries(PAIRS)) {
    it(`${type}: no control without a reader`, () => {
      const fields = fieldsOf(editor);
      const drawn = renderer.map(read).join("\n") + SHARED;
      const unread = fields.filter((f) => !new RegExp(`\\b${f}\\b`).test(drawn));
      expect(unread, `${type} editor writes fields its block never reads`).toEqual([]);
    });
  }

  it("finds fields at all (the scan is not silently empty)", () => {
    const total = Object.values(PAIRS).reduce((n, p) => n + fieldsOf(p.editor).length, 0);
    expect(total).toBeGreaterThan(120);
  });
});
