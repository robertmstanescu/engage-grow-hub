/**
 * Clean-up gate (bundle 9C): the old design choices stay out of the
 * code. Edge shapes, the per-row ink outline and the dark footer band
 * were retired with the redesign; this fails if one is written back.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = join(__dirname, "..", "..");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(tsx?|css)$/.test(name) ? [full] : [];
  });

/* Tests may name the retired settings (they prove stored values are
   ignored), and the restyle lists them as keys to strip from old rows. */
const files = walk(SRC).filter(
  (f) => !/\.test\.tsx?$/.test(f) && !/[\\/]lib[\\/]redesign[\\/]/.test(f) && !/integrations[\\/]supabase[\\/]types/.test(f),
);

const RETIRED: [string, RegExp][] = [
  ["edge shapes", /\b(shapeTop|shapeBottom|SectionShape\w*|section-shape)\b/],
  ["per-row ink outline", /\b(outlineWidth|outlineColor|isRowOutlined)\b/],
  ["dark footer band", /footer-dark/],
];

describe("retired design choices stay retired", () => {
  it("finds the source", () => {
    expect(files.length).toBeGreaterThan(200);
  });

  for (const [name, pattern] of RETIRED) {
    it(`has no ${name} in the code`, () => {
      const offenders = files
        .filter((f) => pattern.test(readFileSync(f, "utf8")))
        .map((f) => relative(SRC, f));
      expect(offenders).toEqual([]);
    });
  }

  it("has no shape or outline component files", () => {
    expect(existsSync(join(SRC, "features/site/rows/SectionShape.tsx"))).toBe(false);
    expect(existsSync(join(SRC, "features/site/rows/rowOutline.ts"))).toBe(false);
  });
});
