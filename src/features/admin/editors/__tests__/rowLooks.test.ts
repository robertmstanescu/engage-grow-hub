import { describe, expect, it } from "vitest";
import type { PageRow } from "@/types/rows";
import { ROW_LOOKS, applyLook, deriveLook, hasRoundedTop, type RowLook } from "../rowLooks";

const row = (o: Partial<PageRow> = {}): PageRow => ({ id: "r", type: "text", content: {}, ...o } as PageRow);
const after = (r: PageRow, look: RowLook): PageRow => {
  const p = applyLook(r, look);
  return { ...r, ...(p.bg_color !== undefined ? { bg_color: p.bg_color } : {}), layout: { ...(r.layout || {}), ...p.layout } } as PageRow;
};

describe("row looks", () => {
  it("derives a look for every stored shape a row can have", () => {
    expect(deriveLook(row())).toBe("plain");
    expect(deriveLook(row({ bg_color: "#fff" }))).toBe("band");
    expect(deriveLook(row({ bg_color: "#fff", layout: { surfaceRadius: "medium" } as PageRow["layout"] }))).toBe("card");
    expect(deriveLook(row({ bg_color: "#fff", layout: { surfaceRadius: "subtle" } as PageRow["layout"] }))).toBe("card");
    expect(deriveLook(row({ layout: { coverImage: "https://x/y.jpg" } as PageRow["layout"] }))).toBe("cover");
    expect(deriveLook(row({ layout: { surfaceRadius: "medium" } as PageRow["layout"] }))).toBe("plain");
  });

  it("round-trips: applying a look yields that look, from any starting point", () => {
    const starts = [
      row(),
      row({ bg_color: "#2B0E33" }),
      row({ bg_color: "#fff", layout: { surfaceRadius: "dramatic" } as PageRow["layout"] }),
      row({ layout: { coverImage: "https://x/y.jpg", surfaceRadius: "medium" } as PageRow["layout"] }),
    ];
    for (const s of starts) for (const l of ROW_LOOKS) {
      const next = after(s, l.key);
      if (l.key === "cover") {
        // Cover needs a picture; without one the row keeps its previous look.
        expect(next.layout?.coverImage ? deriveLook(next) : deriveLook(s)).toBe(next.layout?.coverImage ? "cover" : deriveLook(s));
      } else {
        expect(deriveLook(next)).toBe(l.key);
      }
    }
  });

  it("keeps an existing colour when switching between Card and Band, and drops it for Plain", () => {
    const ink = row({ bg_color: "#2B0E33" });
    expect(after(ink, "card").bg_color).toBe("#2B0E33");
    expect(hasRoundedTop(after(ink, "card"))).toBe(true);
    expect(after(ink, "band").bg_color).toBe("#2B0E33");
    expect(hasRoundedTop(after(ink, "band"))).toBe(false);
    expect(after(ink, "plain").bg_color).toBe("");
  });

  it("leaving Cover clears the picture; other fields are untouched", () => {
    const cover = row({ bg_color: "#fff", layout: { coverImage: "https://x/y.jpg", coverImageAlt: "a", heightMode: "full", outlineWidth: 0 } as PageRow["layout"] });
    const next = after(cover, "band");
    expect(next.layout?.coverImage).toBe("");
    expect(next.layout?.heightMode).toBe("full");
    expect(next.layout?.outlineWidth).toBe(0);
  });
});
