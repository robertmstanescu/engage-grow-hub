/**
 * Corners (the row's own box) and edge shapes (curves that spill over
 * the neighbouring row) must never draw two curves on the same edge —
 * that produced a visible "cut" at the seam.
 */
import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RowSection from "../RowSection";
import type { PageRow } from "@/types/rows";

const makeRow = (layout: Record<string, unknown>): PageRow =>
  ({
    id: "row-corners",
    type: "text",
    strip_title: "Corners",
    bg_color: "#F4ECF6",
    content: {},
    layout,
  }) as unknown as PageRow;

const sectionOf = (layout: Record<string, unknown>) => {
  const { container } = render(
    <RowSection row={makeRow(layout)}>
      <p>content</p>
    </RowSection>,
  );
  return container.querySelector("section") as HTMLElement;
};

describe("row surface corners", () => {
  it("renders square by default", () => {
    const s = sectionOf({});
    expect(s.style.borderTopLeftRadius).toBe("");
    expect(s.style.borderBottomLeftRadius).toBe("");
  });

  /* Rows stack like cards: the chosen radius rounds the TOP corners only.
     The foot stays square because the next card's lip covers it; a
     rounded foot drew a second curve just above that lip. */
  it("applies the chosen radius to the top corners only when no edge shape is set", () => {
    const s = sectionOf({ surfaceRadius: "medium" });
    expect(s.style.borderTopLeftRadius).toBe("24px");
    expect(s.style.borderTopRightRadius).toBe("24px");
    expect(s.style.borderBottomLeftRadius).toBe("0");
    expect(s.style.borderBottomRightRadius).toBe("0");
  });

  it("leaves the top square when it carries a shape (the cap curves instead)", () => {
    const s = sectionOf({
      surfaceRadius: "medium",
      shapeTop: { kind: "rounded", size: "medium" },
    });
    expect(s.style.borderTopLeftRadius).toBe("0");
    expect(s.style.borderTopRightRadius).toBe("0");
    expect(s.style.borderBottomLeftRadius).toBe("0");
    expect(s.style.borderBottomRightRadius).toBe("0");
  });

  /* jsdom drops `var()` border values from the DOM style, so the outline
     is asserted on the server-rendered markup, which keeps the literal
     declarations. */
  it("outlines the sides and top of a rounded surface, never the foot", () => {
    const markup = renderToStaticMarkup(
      <RowSection row={makeRow({ surfaceRadius: "medium" })}>
        <p>content</p>
      </RowSection>,
    );
    const style = /<section[^>]*style="([^"]*)"/.exec(markup)?.[1] ?? "";
    expect(style).toContain("border-left:var(--outline-ink-border)");
    expect(style).toContain("border-right:var(--outline-ink-border)");
    expect(style).toContain("border-top:var(--outline-ink-border)");
    expect(style).not.toContain("border-bottom:");
  });

  it("lets a row override the outline colour and width for itself and its children", () => {
    const markup = renderToStaticMarkup(
      <RowSection row={makeRow({ surfaceRadius: "medium", outlineColor: "#c00", outlineWidth: 3 })}>
        <p>content</p>
      </RowSection>,
    );
    const style = /<section[^>]*style="([^"]*)"/.exec(markup)?.[1] ?? "";
    expect(style).toContain("--outline-ink:#c00");
    expect(style).toContain("--outline-ink-width:3px");
    // re-declared on the row so it resolves against the row's own tokens
    expect(style).toContain("--outline-ink-border:var(--outline-ink-width) solid var(--outline-ink)");
  });

  it("a row-level width of 0 turns its outline off", () => {
    const markup = renderToStaticMarkup(
      <RowSection row={makeRow({ surfaceRadius: "medium", outlineWidth: 0 })}>
        <p>content</p>
      </RowSection>,
    );
    expect(/<section[^>]*style="([^"]*)"/.exec(markup)?.[1] ?? "").not.toContain("border-left");
  });

  it("draws no outline on a plain row", () => {
    const markup = renderToStaticMarkup(
      <RowSection row={makeRow({})}>
        <p>content</p>
      </RowSection>,
    );
    expect(/<section[^>]*style="([^"]*)"/.exec(markup)?.[1] ?? "").not.toContain("outline-ink");
  });

  it("does not clip the section when a shape cap paints outside it", () => {
    const s = sectionOf({
      surfaceRadius: "medium",
      shapeBottom: { kind: "rounded", size: "medium" },
    });
    expect(s.style.overflow).not.toBe("hidden");
  });
});
