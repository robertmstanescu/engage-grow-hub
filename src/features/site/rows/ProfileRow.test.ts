import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The credential chips belong to the person, not to the story: they sit
 * under the picture and the name in every layout (owner's choice,
 * 10 Nov 2026). The About artboard draws them under the story, so this
 * guards against a later "match the artboard" pass moving them back.
 */
describe("ProfileRow credential chips", () => {
  const source = readFileSync(resolve(process.cwd(), "src/features/site/rows/ProfileRow.tsx"), "utf8");

  it("renders the chips once, for every layout", () => {
    expect(source.match(/\{credentialChips\}/g) ?? []).toHaveLength(1);
    expect(source).not.toMatch(/portrait && credentialChips/);
  });

  it("places the chips in the picture column, before the story", () => {
    const chips = source.indexOf("{credentialChips}");
    const name = source.indexOf("${prefix}.name");
    const story = source.indexOf("${prefix}.body");
    expect(name).toBeGreaterThan(-1);
    expect(story).toBeGreaterThan(-1);
    expect(chips).toBeGreaterThan(name);
    expect(chips).toBeLessThan(story);
  });
});
