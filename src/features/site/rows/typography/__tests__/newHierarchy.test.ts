import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Heading hierarchy guard (redesign §2.2, plan Phase 2):
 * every heading role reads a shared token for size, weight AND colour —
 * never an inlined value — and the weight maps to a colour role
 * (hero ink, H2/H3 heading violet, eyebrows gold, body soft plum).
 */

const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf8");

const rowSection = read("../RowSection.tsx");
const rowTitle = read("../RowTitle.tsx");
const rowEyebrow = read("../RowEyebrow.tsx");
const rowBody = read("../RowBody.tsx");
const rowSubtitle = read("../RowSubtitle.tsx");
const indexCss = read("../../../../../index.css");

describe("heading hierarchy tokens", () => {
  it("RowSection publishes the heading, body and eyebrow tones next to --row-fg", () => {
    expect(rowSection).toContain('"--row-heading"');
    expect(rowSection).toContain('"--row-body"');
    expect(rowSection).toContain('"--row-eyebrow"');
  });

  it("dark surfaces keep the light foreground; light surfaces use the role tokens", () => {
    expect(rowSection).toContain("hsl(var(--heading))");
    expect(rowSection).toContain("hsl(var(--body))");
    expect(rowSection).toContain("hsl(var(--gold-text))");
    expect(rowSection).toContain("hsl(var(--gold))");
  });

  it("RowTitle sizes, weights and colours from tokens only", () => {
    expect(rowTitle).toContain("var(--fs-title)");
    expect(rowTitle).toContain("var(--lh-title");
    expect(rowTitle).toContain("var(--ls-title");
    expect(rowTitle).toContain("var(--row-heading");
    // Weight scale: H1/H2 extrabold (800), H3 bold (700) — no font-black.
    expect(rowTitle).toContain("font-extrabold");
    expect(rowTitle).not.toContain("font-black");
    expect(rowTitle).not.toMatch(/fontSize:\s*["'`]\d/);
  });

  it("RowEyebrow reads the eyebrow tone and label tracking tokens", () => {
    expect(rowEyebrow).toContain("var(--row-eyebrow");
    expect(rowEyebrow).toContain("var(--fs-eyebrow)");
    expect(rowEyebrow).toContain("var(--ls-label");
  });

  it("RowBody reads the body tone and reading-comfort tokens", () => {
    expect(rowBody).toContain("var(--row-body");
    expect(rowBody).toContain("var(--fs-body)");
    expect(rowBody).toContain("var(--lh-body");
    expect(rowBody).toContain("var(--ls-body");
  });

  it("RowSubtitle reads the subtitle scale tokens", () => {
    expect(rowSubtitle).toContain("var(--fs-subtitle)");
  });

  it("the weight tokens exist and headings never use vh sizing", () => {
    expect(indexCss).toContain("--fw-hero: 800");
    expect(indexCss).toContain("--fw-h2: 800");
    expect(indexCss).toContain("--fw-h3: 700");
    const fsLines = indexCss.split("\n").filter((l) => l.includes("--fs-"));
    for (const line of fsLines) {
      expect(line).not.toMatch(/vh/);
    }
  });
});
