/**
 * A row holding more than one widget must paint ONE surface (single
 * coloured band, single rounded edge) around all of its widgets instead
 * of letting each widget paint its own band.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import RowRenderer from "../RowRenderer";
import type { PageRowV3 } from "@/types/rows";

const widget = (id: string, type: string, data: Record<string, unknown>) => ({
  id,
  type,
  data,
});

const makeRow = (widgets: ReturnType<typeof widget>[]): PageRowV3 =>
  ({
    id: "row-test",
    schema_version: 3,
    strip_title: "Test row",
    bg_color: "#F4ECF6",
    columns: [
      {
        id: "col-1",
        cells: [{ id: "cell-1", widgets }],
      },
    ],
    layout: {},
  }) as unknown as PageRowV3;

const renderRow = (row: PageRowV3) =>
  render(
    <MemoryRouter>
      <RowRenderer row={row} rowIndex={0} align="center" globalMap={new Map()} />
    </MemoryRouter>,
  );

describe("row-level surface", () => {
  it("paints a single section for a two-widget row", () => {
    const { container } = renderRow(
      makeRow([
        widget("w1", "text", { title: "One", body: "<p>a</p>" }),
        widget("w2", "text", { title: "Two", body: "<p>b</p>" }),
      ]),
    );
    expect(container.querySelectorAll("section").length).toBe(1);
  });

  it("leaves a single-widget row painting itself as before", () => {
    const { container } = renderRow(
      makeRow([widget("w1", "text", { title: "One", body: "<p>a</p>" })]),
    );
    expect(container.querySelectorAll("section").length).toBe(1);
  });

  it("paints a row surface when the row has its own cover image", () => {
    const row = makeRow([widget("w1", "text", { title: "One", body: "<p>a</p>" })]);
    row.layout = { coverImage: "https://example.com/a.jpg", coverImageAlt: "A" } as never;
    const { container } = renderRow(row);
    expect(container.querySelector('img[alt="A"]')).not.toBeNull();
  });
});
