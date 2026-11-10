import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "./sanitize";

/** The handwritten face is Playwrite Cuba (owner, 10 Nov 2026). */
describe("handwritten face", () => {
  it("saved text that names the old face is read as the new one", () => {
    const saved = `<span style="font-family: 'Architects Daughter', cursive">Now you get why people leave.</span>`;
    const out = sanitizeHtml(saved);
    expect(out).toContain("Playwrite CU");
    expect(out).not.toContain("Architects Daughter");
    expect(out).toContain("Now you get why people leave.");
  });

  it("the page loads the new face and the helper class uses it", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
    expect(html).toContain("family=Playwrite+CU");
    expect(html).not.toContain("Architects+Daughter");
    expect(readFileSync(resolve(process.cwd(), "src/index.css"), "utf8")).toMatch(/\.font-hand \{ font-family: 'Playwrite CU'/);
  });
});
