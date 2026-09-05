import { describe, it, expect } from "vitest";
import {
  findMissingAltViolations,
  formatAltMissingMessage,
} from "./contentAccessibility";

/**
 * Publish-gate coverage for all three stored row shapes (v1 flat,
 * v2 columns/widgets, v3 columns/cells/widgets — the canonical shape
 * every page saved by the current builder uses).
 */

const v1Row = {
  id: "r1",
  type: "boxed",
  strip_title: "My boxed row",
  content: { cover_image: "https://img/x.jpg", cover_image_alt: "" },
};

const v3Row = {
  id: "r2",
  schema_version: 3,
  strip_title: "Text with cover",
  columns: [
    {
      cells: [
        {
          widgets: [
            {
              id: "w1",
              type: "text",
              data: { cover_image: "https://img/y.jpg", cover_image_alt: "  " },
            },
          ],
        },
      ],
    },
  ],
};

const v3RowOk = {
  id: "r3",
  schema_version: 3,
  strip_title: "OK row",
  columns: [
    {
      cells: [
        {
          widgets: [
            {
              id: "w2",
              type: "text",
              data: { cover_image: "https://img/y.jpg", cover_image_alt: "A described photo" },
            },
          ],
        },
      ],
    },
  ],
};

describe("findMissingAltViolations", () => {
  it("flags v1 rows with an image URL but empty alt", () => {
    const v = findMissingAltViolations([v1Row as any]);
    expect(v).toHaveLength(1);
    expect(v[0].stripTitle).toBe("My boxed row");
  });

  it("flags v3 nested widgets (canonical shape)", () => {
    const v = findMissingAltViolations([v3Row as any]);
    expect(v).toHaveLength(1);
    expect(v[0].rowType).toBe("text");
  });

  it("passes when alt text is present", () => {
    expect(findMissingAltViolations([v3RowOk as any])).toHaveLength(0);
  });

  it("passes when no image URL is set at all", () => {
    const row = {
      id: "r4",
      schema_version: 3,
      columns: [{ cells: [{ widgets: [{ id: "w", type: "text", data: {} }] }] }],
    };
    expect(findMissingAltViolations([row as any])).toHaveLength(0);
  });

  it("formats a blocking message when violations exist", () => {
    expect(formatAltMissingMessage([])).toBeNull();
    expect(formatAltMissingMessage(findMissingAltViolations([v3Row as any]))).toMatch(
      /Cannot publish/,
    );
  });
});
