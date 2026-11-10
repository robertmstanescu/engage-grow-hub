import { describe, it, expect } from "vitest";
import { findMissingAltViolations } from "../contentAccessibility";
import type { PageRow } from "@/types/rows";

const v3Row = (overrides: Record<string, unknown>): PageRow =>
  ({
    id: "row-1",
    type: "text",
    columns: [
      {
        id: "col-1",
        cells: [
          {
            id: "cell-1",
            widgets: [
              { id: "w-1", type: "text", data: { body: "Hello" } },
            ],
          },
        ],
      },
    ],
    ...overrides,
  }) as unknown as PageRow;

describe("findMissingAltViolations — row-level cover image", () => {
  it("flags a row cover image without alt text", () => {
    const rows = [
      v3Row({
        layout: { coverImage: "https://example.com/cover.webp" },
      }),
    ];
    const violations = findMissingAltViolations(rows);
    expect(violations).toHaveLength(1);
    expect(violations[0].label).toBe("Row cover image");
  });

  it("flags a row cover image whose alt text is blank", () => {
    const rows = [
      v3Row({
        layout: { coverImage: "https://example.com/cover.webp", coverImageAlt: "   " },
      }),
    ];
    expect(findMissingAltViolations(rows)).toHaveLength(1);
  });

  it("passes a row cover image with alt text", () => {
    const rows = [
      v3Row({
        layout: {
          coverImage: "https://example.com/cover.webp",
          coverImageAlt: "Team workshop in Stockholm",
        },
      }),
    ];
    expect(findMissingAltViolations(rows)).toHaveLength(0);
  });

  it("ignores rows without a cover image", () => {
    expect(findMissingAltViolations([v3Row({})])).toHaveLength(0);
  });

  it("still flags widget images inside the same row", () => {
    const row = v3Row({
      layout: { coverImage: "https://example.com/cover.webp", coverImageAlt: "Cover" },
    }) as any;
    row.columns[0].cells[0].widgets = [
      { id: "w-1", type: "image", data: { url: "https://example.com/a.webp" } },
    ];
    const violations = findMissingAltViolations([row]);
    expect(violations).toHaveLength(1);
    expect(violations[0].label).toBe("Image");
  });
});
