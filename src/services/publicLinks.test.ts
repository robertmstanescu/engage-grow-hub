/**
 * Security gate (bundle 9E): a link or stylesheet that comes from the
 * CMS must pass through a guard before it is printed on a public page.
 * This reads the public source and fails on a raw one, so a new row
 * cannot quietly reintroduce a `javascript:` link.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..");
const PUBLIC_DIRS = ["features/site", "features/widgets", "pages", "components/widgets"];

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [full] : [];
  });

const files = PUBLIC_DIRS.flatMap((d) => walk(join(ROOT, d))).filter(
  (f) => !/[\\/]pages[\\/]Admin/.test(f) && !/Editor\.tsx$/.test(f) && !/Admin\.tsx$/.test(f),
);

describe("public links and styles are guarded", () => {
  it("finds the public source", () => {
    expect(files.length).toBeGreaterThan(40);
  });

  it("never prints a content field straight into href", () => {
    // `c.`, `card.`, `item.`, `link.`, `row.content.` are how rows name CMS content.
    const raw = /href=\{\s*(c|card|item|link|tier|step|row\.content)\.[a-zA-Z_.]+\s*(\|\|[^}]*)?\}/;
    const offenders = files
      .flatMap((f) =>
        readFileSync(f, "utf8")
          .split("\n")
          .map((line, i) => (raw.test(line) ? `${relative(ROOT, f)}:${i + 1}` : "")),
      )
      .filter(Boolean);
    expect(offenders).toEqual([]);
  });

  it("opens new tabs only with noopener or noreferrer", () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      const tags = src.match(/<a\b[^>]*target="_blank"[^>]*>/gs) || [];
      for (const tag of tags) if (!/noopener|noreferrer/.test(tag)) offenders.push(relative(ROOT, f));
    }
    expect(offenders).toEqual([]);
  });

  it("prints custom CSS only through safeCss", () => {
    const offenders = files
      .filter((f) => /<style dangerouslySetInnerHTML/.test(readFileSync(f, "utf8")))
      .filter((f) => !/safeCss\(/.test(readFileSync(f, "utf8")))
      .map((f) => relative(ROOT, f));
    expect(offenders).toEqual([]);
  });
});
