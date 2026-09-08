import { describe, expect, it } from "vitest";
import { listWidgets } from "@/widgets";
import "@/features/widgets/contact";
import { BLOCK_FAMILIES, defaultVariant, familyOf } from "../blockFamilies";
import { SECTION_LIBRARY } from "../sectionLibrary";
import { isPageRowV3 } from "@/types/rows";

describe("block families", () => {
  it("has eight families and every registered widget belongs to exactly one", () => {
    expect(BLOCK_FAMILIES).toHaveLength(8);
    for (const w of listWidgets()) {
      const owners = BLOCK_FAMILIES.filter((f) => f.variants.some((v) => v.type === w.type));
      expect(owners.map((o) => o.key), `widget "${w.type}" must belong to exactly one family`).toHaveLength(1);
    }
  });

  it("every variant is a registered widget and the default is first", () => {
    for (const f of BLOCK_FAMILIES) {
      for (const v of f.variants) expect(listWidgets().some((w) => w.type === v.type), `${f.key} › ${v.type}`).toBe(true);
      expect(defaultVariant(f)).toBe(f.variants[0]);
    }
    expect(familyOf("boxed")?.key).toBe("cards");
    expect(familyOf("nope")).toBeUndefined();
  });
});

describe("section library", () => {
  it("builds a fresh v3 row with a registered widget each time, with unique ids", () => {
    expect(SECTION_LIBRARY.length).toBeGreaterThanOrEqual(12);
    const keys = new Set(SECTION_LIBRARY.map((s) => s.key));
    expect(keys.size).toBe(SECTION_LIBRARY.length);
    for (const s of SECTION_LIBRARY) {
      const a = s.build();
      const b = s.build();
      expect(isPageRowV3(a), s.key).toBe(true);
      expect(a.id).not.toBe(b.id);
      const widget = a.columns[0]?.cells?.[0]?.widgets?.[0];
      expect(widget, `${s.key} has a widget`).toBeTruthy();
      expect(listWidgets().some((w) => w.type === widget!.type), `${s.key} › ${widget!.type} registered`).toBe(true);
      expect(a.strip_title.length).toBeGreaterThan(0);
    }
  });
});
