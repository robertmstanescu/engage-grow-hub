/**
 * US10: every internal link a public page writes in code ends with "/",
 * the same address the sitemap and canonical tags use, so a crawler never
 * follows a link into a redirect.
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
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });

const files = PUBLIC_DIRS.flatMap((d) => walk(join(ROOT, d))).filter(
  (f) => !/[\\/]pages[\\/]Admin/.test(f) && !/Editor\.tsx$/.test(f) && !/Admin\.tsx$/.test(f) && !/Live\.tsx$/.test(f),
);

/**
 * `to="/blog"`, `href="/p/x"`, `to={`/blog/${slug}`}`: an internal path in
 * a link attribute whose last character is not "/". Query strings and
 * #anchors are left alone.
 */
const UNSLASHED = /\b(?:to|href)=\{?\s*(?:safeHref\()?["'`](\/[a-z][^"'`?#\s]*[^/"'`?#\s])["'`]/;

describe("internal links end with a slash", () => {
  it("finds the public source", () => {
    expect(files.length).toBeGreaterThan(40);
  });

  it("has no internal link without its trailing slash", () => {
    const offenders = files
      .flatMap((f) =>
        readFileSync(f, "utf8")
          .split("\n")
          .map((line, i) => {
            const m = UNSLASHED.exec(line);
            return m ? `${relative(ROOT, f)}:${i + 1} ${m[1]}` : "";
          }),
      )
      .filter(Boolean);
    expect(offenders).toEqual([]);
  });
});
