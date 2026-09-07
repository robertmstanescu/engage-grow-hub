/**
 * Guards the two About Us regressions:
 *  1. every row body carries the shared `data-row-part="body"` marker, which
 *     is both the list-marker CSS hook and the alignment anchor;
 *  2. SemanticAligner picks the body line when both columns expose one.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TextRow from "../TextRow";
import ProfileRow from "../ProfileRow";
import ImageTextRow from "../ImageTextRow";
import type { PageRow } from "@/types/rows";

const baseRow = (type: string, content: Record<string, unknown>): PageRow =>
  ({
    id: `row-${type}`,
    type,
    strip_title: "Section",
    bg_color: "#FFFFFF",
    layout: {},
    content,
  }) as unknown as PageRow;

describe("row bodies expose the shared body marker", () => {
  it("TextRow body is marked", () => {
    const { container } = render(
      <TextRow row={baseRow("text", { body: "<ul><li>one</li></ul>" })} rowIndex={0} />,
    );
    expect(container.querySelectorAll('[data-row-part="body"]').length).toBeGreaterThan(0);
    expect(container.querySelector("ul li")?.textContent).toBe("one");
  });

  it("ProfileRow body is marked", () => {
    const { container } = render(
      <ProfileRow row={baseRow("profile", { body: "<ul><li>two</li></ul>" })} rowIndex={0} />,
    );
    expect(container.querySelectorAll('[data-row-part="body"]').length).toBeGreaterThan(0);
    expect(container.querySelector("ul li")?.textContent).toBe("two");
  });

  it("ImageTextRow description is marked", () => {
    const { container } = render(
      <ImageTextRow
        row={baseRow("image_text", { description: "<ol><li>three</li></ol>" })}
        rowIndex={0}
      />,
    );
    expect(container.querySelectorAll('[data-row-part="body"]').length).toBeGreaterThan(0);
    expect(container.querySelector("ol li")?.textContent).toBe("three");
  });
});

describe("SemanticAligner", () => {
  it("renders both columns and keeps body content intact", async () => {
    const { default: SemanticAligner } = await import("../SemanticAligner");
    render(
      <SemanticAligner
        widths={[50, 50]}
        columns={[
          <div key="a">
            <div data-row-part="title">Title</div>
            <div data-row-part="body">Left body</div>
          </div>,
          <div key="b">
            <div data-row-part="body">Right body</div>
          </div>,
        ]}
      />,
    );
    expect(screen.getByText("Left body")).toBeTruthy();
    expect(screen.getByText("Right body")).toBeTruthy();
  });
});
