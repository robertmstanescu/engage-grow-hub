import { describe, expect, it } from "vitest";
import { findCountry, parseCountryPaste, resolveMapGroups, defaultMapGroups, mapCounters, workedPlaces } from "./resolve";
import { MAP_ART_H, MAP_ART_W, MAP_BASE_PATHS, MAP_COUNTRIES, MAP_DOTS } from "./mapData";
import { MAP_H, MAP_W } from "./zoom";
import { OWNER_MAP_LIST } from "./ownerList";
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

  it("the worked counters leave out a market in neither list; the markets counter counts it", () => {
    const c = { ...WORLD_MAP_DEFAULTS, worked: ["Canada"], hr: ["Spain", "Sweden"], main: ["Sweden", "Romania"] };
    const g = resolveMapGroups(c);
    expect(g.get("Romania")).toBe("main");
    expect(g.get("Sweden")).toBe("main");
    expect(mapCounters(c)).toEqual({ comms: 3, hr: 2, main: 2 });
    expect(workedPlaces(c).comms.has("Romania")).toBe(false);
  });

  it("the owner's list resolves to 36 worked places, 15 with HR, and nine main markets", () => {
    const c = { ...WORLD_MAP_DEFAULTS, worked: [...OWNER_MAP_LIST.worked], hr: [...OWNER_MAP_LIST.hr], main: [...OWNER_MAP_LIST.main] };
    // Every name on the list is a place the map can draw.
    for (const name of [...OWNER_MAP_LIST.worked, ...OWNER_MAP_LIST.hr, ...OWNER_MAP_LIST.main]) {
      expect(findCountry(name)?.name, name).toBe(name);
    }
    expect(OWNER_MAP_LIST.worked).toHaveLength(21);
    expect(OWNER_MAP_LIST.hr).toHaveLength(15);
    expect(mapCounters(c)).toEqual({ comms: 36, hr: 15, main: 9 });
    const g = resolveMapGroups(c);
    expect(g.size).toBe(38); // the 36 plus Romania and Ireland, markets only
    expect([...g].filter(([, s]) => s === "main").map(([n]) => n).sort()).toEqual(
      ["Denmark", "Finland", "Ireland", "Norway", "Romania", "Spain", "Sweden", "United Kingdom", "United States"],
    );
  });

  it("draws Congo as the Democratic Republic, and Hong Kong and Singapore as dots", () => {
    expect(findCountry("Democratic Republic of the Congo")?.name).toBe("Democratic Republic of the Congo");
    expect(findCountry("DRC")?.name).toBe("Democratic Republic of the Congo");
    expect(findCountry("Republic of the Congo")).toBeUndefined();
    expect(MAP_COUNTRIES.some((c) => c.name === "Republic of the Congo")).toBe(false);
    expect(MAP_DOTS.map((d) => d.name).sort()).toEqual(["Hong Kong", "Singapore"]);
    expect(findCountry("Hong Kong (dot)")?.name).toBe("Hong Kong");
  });

  it("the built-in shading matches the owner's list", () => {
    const g = defaultMapGroups();
    expect(g.size).toBe(38);
    for (const name of OWNER_MAP_LIST.worked) expect(g.get(name), name).toBe("worked");
    for (const name of OWNER_MAP_LIST.main) expect(g.get(name), name).toBe("main");
  });

  it("copes with empty, odd and hostile input", () => {
    expect(findCountry("")).toBeUndefined();
    expect(findCountry(null as unknown as string)).toBeUndefined();
    expect(mapCounters({ ...WORLD_MAP_DEFAULTS, worked: ["<script>", "Sweden", "sweden", " SWEDEN "] })).toEqual({ comms: 1, hr: 0, main: 0 });
  });

  it("the row's box matches the generated art, which leaves Antarctica out", () => {
    expect([MAP_W, MAP_H]).toEqual([MAP_ART_W, MAP_ART_H]);
    // Every point of every shape sits inside the box: nothing below Cape Horn.
    const all = [...MAP_BASE_PATHS, ...MAP_COUNTRIES.map((c) => c.d)].join("");
    const ys = [...all.matchAll(/,(-?[\d.]+)/g)].map((m) => Number(m[1]));
    expect(Math.max(...ys)).toBeLessThanOrEqual(MAP_ART_H);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
  });
});
