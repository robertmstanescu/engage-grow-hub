/**
 * Square boxes — the admin uses the shell radius (4–6px) everywhere.
 *
 * Pills (`rounded-full`) and the extra-large radii are reserved for
 * things that are genuinely round: colour swatches, status dots, toggle
 * knobs, avatars. Anything else that turns up here is a button, badge or
 * card that should use `rounded`, `rounded-md` or the `.admin-btn`
 * classes instead.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROUND_THINGS = [
  /\bw-(1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10) h-\1 rounded-full/, // dots, swatches, avatars
  /\bh-(1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10) w-\1 rounded-full/,
  /\bh-5 w-9 rounded-full/, // toggle track
  /\bh-1\.5 rounded-full appearance-none/, // range slider track
  /admin-dot/,
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

describe("admin square corners", () => {
  it("uses no pill or extra-round corners except on round things", () => {
    const hits: string[] = [];
    for (const f of walk("src/features/admin")) {
      readFileSync(f, "utf8").split("\n").forEach((line, i) => {
        if (!/rounded-(full|xl|2xl|3xl)/.test(line)) return;
        if (ROUND_THINGS.some((re) => re.test(line))) return;
        hits.push(`${f}:${i + 1}`);
      });
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });
});
