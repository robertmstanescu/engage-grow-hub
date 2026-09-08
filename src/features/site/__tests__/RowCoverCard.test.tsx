import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import RowCoverCard from "../RowCoverCard";
import type { PageRow } from "@/types/rows";

/**
 * Corner rounding of the cover treatment.
 *
 * Rows are square by default since the "Corners" setting became opt-in
 * (so a row's own box never fights an edge shape). The "card" variant
 * (FAQ rows) is an inner surface with its own shadow and must keep its
 * rounded look without an explicit Corners choice — it went square by
 * accident when the row default changed. An explicit choice still wins.
 *
 * Static markup on purpose: jsdom drops some style values; the server
 * markup keeps the literal `border-radius:` declaration.
 */
const row = (layout?: PageRow["layout"]): PageRow => ({
  id: "r",
  type: "faq",
  strip_title: "",
  bg_color: "",
  content: { cover_image: "https://example.com/c.jpg", cover_image_alt: "c" },
  layout,
});
const outerRadius = (markup: string) => /<div style="([^"]*)"/.exec(markup)?.[1].match(/border-radius:([^;]+)/)?.[1];

describe("RowCoverCard corners", () => {
  it("card variant keeps a 48px radius when the row has no Corners choice", () => {
    expect(outerRadius(renderToStaticMarkup(<RowCoverCard row={row()} variant="card">x</RowCoverCard>))).toBe("48px");
  });

  it("flush variant follows the row: square when no Corners choice", () => {
    expect(outerRadius(renderToStaticMarkup(<RowCoverCard row={row()}>x</RowCoverCard>))).toBe("0px");
  });

  it("an explicit Corners choice wins for both variants", () => {
    const l = { surfaceRadius: "subtle" } as PageRow["layout"];
    expect(outerRadius(renderToStaticMarkup(<RowCoverCard row={row(l)} variant="card">x</RowCoverCard>))).toBe("16px");
    expect(outerRadius(renderToStaticMarkup(<RowCoverCard row={row(l)}>x</RowCoverCard>))).toBe("16px");
  });

  it("renders children unwrapped when there is no cover image", () => {
    const bare = { ...row(), content: {} };
    expect(renderToStaticMarkup(<RowCoverCard row={bare}>x</RowCoverCard>)).toBe("x");
  });
});
