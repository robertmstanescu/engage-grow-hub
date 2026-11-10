/**
 * Corners are the only curve a row draws. The decorative edge shapes
 * and the per-row ink outline were retired with the redesign (bundle
 * 9C): rows saved before then may still carry those settings, and they
 * must be ignored, never drawn.
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

  it("ignores a stored edge shape: the corners follow the radius and no cap is drawn", () => {
    const s = sectionOf({
      surfaceRadius: "medium",
      shapeTop: { kind: "rounded", size: "medium" },
      shapeBottom: { kind: "wave", size: "dramatic" },
    });
    expect(s.style.borderTopLeftRadius).toBe("24px");
    expect(s.style.borderTopRightRadius).toBe("24px");
    expect(s.querySelector("svg")).toBeNull();
    expect(s.querySelector("[data-section-shape]")).toBeNull();
    expect(s.style.zIndex).toBe("");
  });

  /* jsdom drops `var()` border values from the DOM style, so the outline
     is asserted on the server-rendered markup, which keeps the literal
     declarations. */
  it("draws no outline on a rounded surface unless the row asks for one", () => {
    const markup = renderToStaticMarkup(
      <RowSection row={makeRow({ surfaceRadius: "medium" })}>
        <p>content</p>
      </RowSection>,
    );
    const style = /<section[^>]*style="([^"]*)"/.exec(markup)?.[1] ?? "";
    expect(style).not.toContain("--outline-ink-border)");
  });

  it("ignores a stored outline colour and width", () => {
    const markup = renderToStaticMarkup(
      <RowSection row={makeRow({ surfaceRadius: "medium", outlineColor: "#c00", outlineWidth: 5 })}>
        <p>content</p>
      </RowSection>,
    );
    const style = /<section[^>]*style="([^"]*)"/.exec(markup)?.[1] ?? "";
    expect(style).not.toContain("outline-ink");
    expect(style).not.toContain("border-left");
    expect(style).not.toContain("#c00");
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

  it("clips a rounded surface to its curve, stored shapes or not", () => {
    const s = sectionOf({
      surfaceRadius: "medium",
      shapeBottom: { kind: "rounded", size: "medium" },
    });
    expect(s.style.overflow).toBe("hidden");
  });
});
