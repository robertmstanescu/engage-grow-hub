/**
 * Corners (the row's own box) and edge shapes (curves that spill over
 * the neighbouring row) must never draw two curves on the same edge —
 * that produced a visible "cut" at the seam.
 */
import { render } from "@testing-library/react";
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

  it("applies the chosen radius to all corners when no edge shape is set", () => {
    const s = sectionOf({ surfaceRadius: "medium" });
    expect(s.style.borderTopLeftRadius).toBe("24px");
    expect(s.style.borderTopRightRadius).toBe("24px");
    expect(s.style.borderBottomLeftRadius).toBe("24px");
    expect(s.style.borderBottomRightRadius).toBe("24px");
  });

  it("leaves an edge square when that edge carries a shape", () => {
    const s = sectionOf({
      surfaceRadius: "medium",
      shapeTop: { kind: "rounded", size: "medium" },
    });
    expect(s.style.borderTopLeftRadius).toBe("0");
    expect(s.style.borderTopRightRadius).toBe("0");
    expect(s.style.borderBottomLeftRadius).toBe("24px");
    expect(s.style.borderBottomRightRadius).toBe("24px");
  });

  it("does not clip the section when a shape cap paints outside it", () => {
    const s = sectionOf({
      surfaceRadius: "medium",
      shapeBottom: { kind: "rounded", size: "medium" },
    });
    expect(s.style.overflow).not.toBe("hidden");
  });
});
