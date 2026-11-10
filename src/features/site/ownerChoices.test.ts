import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The owner's design choices of 10 Nov 2026. Each was asked for by name,
 * so a refactor must not quietly undo one.
 */
const read = (p: string) => readFileSync(resolve(__dirname, "../../..", p), "utf8");

describe("owner's choices of 10 Nov 2026", () => {
  const css = read("src/index.css");

  it("small labels on light are pure black, not mustard", () => {
    expect(css).toMatch(/--gold-text:\s*0 0% 0%/);
    expect(css).toMatch(/--hero-label:\s*0 0% 0%/);
  });

  it("main markets are Cobalt Blue", () => {
    expect(css).toMatch(/--map-main:\s*215 100% 34%/);
  });

  it("the map keeps the credit its licence asks for", () => {
    expect(read("src/features/widgets/world_map/WorldMapArt.tsx")).toContain("Map: amCharts");
  });

  it("a service card is glass in its own colour", () => {
    expect(css).toMatch(/\.surface-card\.tint-card\s*\{[^}]*var\(--card-tint/);
    expect(read("src/features/site/rows/BoxedRow.tsx")).toContain('"--card-tint"');
  });

  it("the footer prints the socials once, as a line in the brand block", () => {
    const footer = read("src/features/site/Footer.tsx");
    expect(footer.match(/activeLinks\.map\(/g)).toHaveLength(1);
    expect(footer).toContain('aria-label="Connect"');
  });

  it("cards, pills, chips, the menu and dark bands are liquid glass; photos are not", () => {
    expect(css).toMatch(/--lg-blur:\s*blur\(24px\) saturate\(180%\)/);
    expect(css).toMatch(/\.surface-card\s*\{[^}]*var\(--lg-light-bg\)/);
    for (const sel of [".btn-ink", ".btn-ghost-ink", ".cta-room", ".pill-tag", ".work-pill"]) {
      expect(css).toContain(`${sel},`);
    }
    expect(read("src/features/site/Navbar.tsx")).toContain("lg-light");
    expect(read("src/features/site/HeroSection.tsx")).toContain("lg-light hero-chip");
    // A photo is never frosted: no liquid glass class sits on an <img>.
    expect(read("src/features/site/rows/BoxedRow.tsx")).not.toMatch(/<img[^>]*lg-(light|dark|tag)/);
  });
});
