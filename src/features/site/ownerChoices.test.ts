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
});
