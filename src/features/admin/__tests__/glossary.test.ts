/**
 * Glossary — labels name the outcome, not the implementation.
 *
 * These strings are the jargon the admin used to show. They must not
 * come back as user-facing labels. Add to the list when you rename one.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const FORBIDDEN: RegExp[] = [
  /label="Eyebrow"/,
  /label="CTA button (label|URL)"/,
  /label="Button (URL|Label)"/,
  /label="Meta (Title|Description) \(for search engines\)"/,
  /label="Widget slug"/,
  /label="Rows (Above|Below) Blog Listing"/,
  />Blocks side by side</,
  />Layout ratios</,
  />Edges &amp; separators</,
  />Row cover image</,
  />Page Identity</,
  />Element Settings</,
  /"Publish All"/,
  /"Save Draft"/,
];

const walk = (dir: string, out: string[] = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "__tests__" || name === "node_modules") continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
};

describe("admin glossary", () => {
  it("does not reintroduce retired jargon labels", () => {
    const files = walk("src/features/admin");
    const hits: string[] = [];
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      for (const re of FORBIDDEN) if (re.test(text)) hits.push(`${f}: ${re}`);
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });
});
