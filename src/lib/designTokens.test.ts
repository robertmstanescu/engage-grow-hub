import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Redesign token layer guard (docs/redesign §2, story A1):
 *  1. every named token exists in src/index.css;
 *  2. every text/ground pair the spec assigns a role to meets WCAG AA
 *     (4.5:1 for text), computed from the HSL channels in the file.
 */

const css = readFileSync(resolve(__dirname, "../index.css"), "utf8");

const REQUIRED_TOKENS = [
  "--paper",
  "--ink",
  "--heading",
  "--body",
  "--meta",
  "--link",
  "--gold-text",
  "--gold",
  "--gold-decor",
  "--deep",
  "--deep-fg",
  "--line-1",
  "--line-2",
  "--line-3",
  "--tint",
  "--glass",
  "--glass-border",
  "--radius-card",
  "--radius-inner",
  "--radius-island",
  "--radius-pill",
  "--ease",
  "--dur-nav",
  "--dur-reveal",
  "--stagger",
  "--fw-hero",
  "--fw-h2",
  "--fw-h3",
  "--fw-eyebrow",
  "--fs-h2",
  "--fs-h3",
];

/** Parse `--name: H S% L%;` channel declarations from the stylesheet. */
const hslChannel = (name: string): [number, number, number] => {
  const match = css.match(new RegExp(`${name.replace(/-/g, "\\-")}:\\s*(\\d+(?:\\.\\d+)?)\\s+(\\d+(?:\\.\\d+)?)%\\s+(\\d+(?:\\.\\d+)?)%`));
  if (!match) throw new Error(`token ${name} not found as HSL channels in index.css`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
};

const hslToRgb = ([h, s, l]: [number, number, number]): [number, number, number] => {
  const sat = s / 100;
  const lig = l / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lig - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r + m, g + m, b + m];
};

const luminance = (rgb: [number, number, number]): number => {
  const f = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
};

const contrast = (a: [number, number, number], b: [number, number, number]): number => {
  const la = luminance(hslToRgb(a));
  const lb = luminance(hslToRgb(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

describe("redesign token layer", () => {
  it("declares every named token in index.css", () => {
    for (const token of REQUIRED_TOKENS) {
      expect(css).toContain(`${token}:`);
    }
  });

  it("keeps the fluid type scale sized by viewport width only (no vh)", () => {
    const fsBlock = css.match(/--fs-[\s\S]*?(?=\n\s*\/\* ─+)/)?.[0] ?? "";
    expect(fsBlock).not.toMatch(/vh/);
  });

  it("meets WCAG AA (4.5:1) for every spec text/ground pair", () => {
    const paper = hslChannel("--paper");
    const card = hslChannel("--card");
    const deep = hslChannel("--deep");
    const tint = hslChannel("--tint");
    const pairs: Array<[string, [number, number, number], [number, number, number]]> = [
      ["ink on paper", hslChannel("--ink"), paper],
      ["ink on card", hslChannel("--ink"), card],
      ["heading on paper", hslChannel("--heading"), paper],
      ["heading on card", hslChannel("--heading"), card],
      ["body on paper", hslChannel("--body"), paper],
      ["body on card", hslChannel("--body"), card],
      ["meta on paper", hslChannel("--meta"), paper],
      ["link on paper", hslChannel("--link"), paper],
      ["gold-text on paper", hslChannel("--gold-text"), paper],
      ["gold-text on tint", hslChannel("--gold-text"), tint],
      ["deep-fg on deep", hslChannel("--deep-fg"), deep],
    ];
    for (const [label, fg, bg] of pairs) {
      expect(contrast(fg, bg), label).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("never uses the bright gold fill as text on light (spec §2.1)", () => {
    // --gold is for fills/strokes/focus rings only; the text role is --gold-text.
    const gold = hslChannel("--gold");
    const paper = hslChannel("--paper");
    expect(contrast(gold, paper)).toBeLessThan(4.5);
  });
});
