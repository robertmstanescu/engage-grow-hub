/**
 * Quotes are Literata (owner, 25 Nov 2026); handwriting stays Playwrite Cuba.
 * Guards the four places that make that true: the font sheet, the token,
 * the blockquote rule and the quote band / testimonial markup.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("quote face", () => {
  it("loads Literata with the other faces, roman 400 to 600 only", () => {
    const html = read("index.html");
    expect(html.match(/family=Literata:opsz,wght@7\.\.72,400\.\.600/g)?.length).toBe(2);
  });

  it("sets every quote in Literata and leaves handwriting alone", () => {
    const css = read("src/index.css");
    expect(css).toMatch(/--font-quote: "Literata"/);
    expect(css).toMatch(/\.font-quote, blockquote \{ font-family: var\(--font-quote\); \}/);
    expect(css).toMatch(/\.work-card-quote \{ font-family: var\(--font-quote\)/);
    expect(css).toMatch(/\.font-hand \{ font-family: 'Playwrite CU'/);
  });

  it("uses the quote face in the quote band and testimonials", () => {
    expect(read("src/features/site/rows/QuoteBandRow.tsx")).toMatch(/rich-text font-quote/);
    expect(read("src/features/site/rows/TestimonialRow.tsx")).toMatch(/rich-text font-quote/);
  });
});
