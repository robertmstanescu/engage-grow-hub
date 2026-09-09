/**
 * Admin colours come from tokens, never from literals.
 *
 * A raw `hsl(280 55% 24%)` looks fine in day mode and vanishes at night.
 * Every admin surface must read its colours from the theme variables
 * (`hsl(var(--foreground))`, `--muted-foreground`, `--admin-accent`,
 * `--admin-ok/warn/bad`). Site-facing renderers are not scanned.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const walk = (dir: string, out: string[] = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "__tests__" || name === "node_modules") continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
};

const FILES = [
  ...walk("src/features/admin"),
  ...readdirSync("src/pages").filter((n) => /^Admin.*\.tsx$/.test(n)).map((n) => join("src/pages", n)),
];

describe("admin colour tokens", () => {
  it("has no raw hsl() literals in admin screens", () => {
    const hits: string[] = [];
    for (const f of FILES) {
      readFileSync(f, "utf8").split("\n").forEach((line, i) => {
        if (/hsl\(\s*\d/.test(line)) hits.push(`${f}:${i + 1}`);
      });
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });
});
