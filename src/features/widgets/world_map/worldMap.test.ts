import { describe, expect, it } from "vitest";
import { findCountry, parseCountryPaste, resolveMapGroups, defaultMapGroups, mapCounters } from "./resolve";
import { WORLD_MAP_DEFAULTS } from "./schema";

describe("world map", () => {
  it("looks up countries case-insensitively", () => {
    expect(findCountry("sweden")?.name).toBe("Sweden");
    expect(findCountry("  UNITED states ")?.name).toBe("United States");
    expect(findCountry("Narnia")).toBeUndefined();
  });

  it("parses pasted lists split by lines, commas or semicolons", () => {
    expect(parseCountryPaste("Sweden, Spain\nRomania;France")).toEqual(["Sweden", "Spain", "Romania", "France"]);
  });

  it("last group wins when a country appears twice", () => {
    const g = resolveMapGroups({ ...WORLD_MAP_DEFAULTS, worked: ["Sweden"], main: ["Sweden"] });
    expect(g.get("Sweden")).toBe("main");
  });

  it("ignores unknown country names", () => {
    const g = resolveMapGroups({ ...WORLD_MAP_DEFAULTS, worked: ["Narnia", "Spain"] });
    expect(g.size).toBe(1);
    expect(g.get("Spain")).toBe("worked");
  });

  it("counts comms as all shaded and HR as hr + main", () => {
    const g = resolveMapGroups({ ...WORLD_MAP_DEFAULTS, worked: ["Canada"], hr: ["Spain"], main: ["Sweden"] });
    expect(mapCounters(g)).toEqual({ comms: 3, hr: 2 });
  });

  it("default groups match the artboard shading (36 worked, 16 with HR)", () => {
    const g = defaultMapGroups();
    expect(mapCounters(g)).toEqual({ comms: 35, hr: 16 });
  });
});
