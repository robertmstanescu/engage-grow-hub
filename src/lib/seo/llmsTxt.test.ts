/** US09: llms.txt opens with the company definition, word for word. */
import { describe, it, expect } from "vitest";
import { buildLlmsTxt } from "../../../scripts/lib/llmsTxt.mjs";
import { COMPANY_DEFINITION } from "../../../scripts/lib/entityGraph.mjs";

const txt = buildLlmsTxt({
  brandName: "The Magic Coffin",
  founderName: "Robert Stănescu",
  bookingUrl: "https://calendar.app.google/rCZX6w2RUWKpsKfRA",
  sections: [
    { title: "Pages", entries: [{ title: "Home", url: "https://x/", summary: "<p>Plain answer.</p>" }, { title: "No url" }] },
    { title: "Work", lines: [] },
  ],
});

describe("buildLlmsTxt", () => {
  it("opens with the brand and the definition word for word", () => {
    const lines = txt.split("\n");
    expect(lines[0]).toBe("# The Magic Coffin");
    expect(lines[2]).toBe(`> ${COMPANY_DEFINITION}`);
  });

  it("names the founder, the place and the booking link before the pages", () => {
    const pages = txt.indexOf("## Pages");
    for (const fact of ["Robert Stănescu", "Stockholm, Sweden", "https://calendar.app.google/rCZX6w2RUWKpsKfRA"]) {
      expect(txt.indexOf(fact)).toBeGreaterThan(0);
      expect(txt.indexOf(fact)).toBeLessThan(pages);
    }
  });

  it("lists each page with its plain summary and skips empty sections", () => {
    expect(txt).toContain("- [Home](https://x/): Plain answer.");
    expect(txt).not.toContain("No url");
    expect(txt).not.toContain("## Work");
    expect(txt.endsWith("\n")).toBe(true);
  });
});
