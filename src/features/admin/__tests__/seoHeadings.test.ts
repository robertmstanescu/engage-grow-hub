import { describe, expect, it } from "vitest";
import { extractHeadings } from "../seoHeadings";

const v1 = (type: string, lines: string[]) => ({ id: type, type, content: { title_lines: lines } });
const v3 = (type: string, lines: string[]) => ({ id: "r-" + type, schema_version: 3, columns: [{ id: "c", cells: [{ id: "ce", widgets: [{ id: "w-" + type, type, data: { title_lines: lines } }] }] }] });

describe("SEO heading audit", () => {
  it("reads v1 rows: hero is the H1, the rest are H2s", () => {
    const { h1s, h2s } = extractHeadings([v1("hero", ["<p>Your organisation</p>", "<p>has vampires.</p>"]), v1("boxed", ["Here's the fix."]), v1("faq", ["Questions"])]);
    expect(h1s).toEqual(["Your organisation has vampires."]);
    expect(h2s).toEqual(["Here's the fix.", "Questions"]);
  });

  it("reads v3 rows the same way (type and data on the widget)", () => {
    const { h1s, h2s } = extractHeadings([v3("hero", ["<p><span style=\"color:#000\">They already quit.</span></p>"]), v3("process_steps", ["How it works"]), v3("boxed", [])]);
    expect(h1s).toEqual(["They already quit."]);
    expect(h2s).toEqual(["How it works"]);
  });

  it("promotes the first titled row when there is no hero", () => {
    const { h1s, h2s } = extractHeadings([v3("text", ["Privacy Policy"]), v3("text", ["What we collect"])]);
    expect(h1s).toEqual(["Privacy Policy"]);
    expect(h2s).toEqual(["What we collect"]);
  });

  it("is empty for pages with no titled rows", () => {
    expect(extractHeadings([v3("image", [])])).toEqual({ h1s: [], h2s: [] });
    expect(extractHeadings(null)).toEqual({ h1s: [], h2s: [] });
  });
});
