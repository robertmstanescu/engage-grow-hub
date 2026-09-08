import { describe, expect, it } from "vitest";
import { writeRowsAtPath } from "../rowsAtPath";
import { fieldPathToNodePath } from "../fieldPath";
import type { PageRow } from "@/types/rows";

const v1: PageRow = { id: "r1", type: "boxed", content: { eyebrow: "Old", cards: [{ title: "One" }, { title: "Two" }] }, columns_data: [{ body: "col2" }] } as unknown as PageRow;
const v3: PageRow = {
  id: "row9", schema_version: 3, strip_title: "", bg_color: "", layout: {}, column_layout: "100",
  columns: [{ id: "c", cell_direction: "vertical", cells: [{ id: "ce", widgets: [{ id: "w1", type: "boxed", data: { eyebrow: "Old", cards: [{ title: "One" }] } }] }] }],
} as unknown as PageRow;

type Card = { title: string };
type Content = { eyebrow?: string; cards?: Card[]; title_lines?: string[] };
const content = (r: PageRow) => r.content as unknown as Content;
const extraCol = (r: PageRow, i: number) => (r as unknown as { columns_data: { body: string }[] }).columns_data[i];
const widgetData = (r: PageRow) => (r as unknown as { columns: { cells: { widgets: { data: Content }[] }[] }[] }).columns[0].cells[0].widgets[0].data;

describe("writeRowsAtPath", () => {
  it("writes a leaf on a v1 row and on a legacy extra column", () => {
    const a = writeRowsAtPath([v1], ["row", "r1", "widget", "r1", "col", "0", "eyebrow"], "New");
    expect(a.ok).toBe(true);
    expect(content(a.rows[0]).eyebrow).toBe("New");
    const b = writeRowsAtPath([v1], ["row", "r1", "widget", "r1", "col", "1", "body"], "changed");
    expect(extraCol(b.rows[0], 0).body).toBe("changed");
  });

  it("writes a list entry by index, and a title as title_lines", () => {
    const a = writeRowsAtPath([v1], ["row", "r1", "widget", "r1", "list", "cards", "1", "title"], "Deux");
    expect(content(a.rows[0]).cards?.map((c) => c.title)).toEqual(["One", "Deux"]);
    const t = writeRowsAtPath([v1], ["row", "r1", "widget", "r1", "col", "0", "title"], "Line one\nLine two");
    expect(content(t.rows[0]).title_lines).toEqual(["Line one", "Line two"]);
    expect(writeRowsAtPath([v1], ["row", "r1", "widget", "r1", "list", "cards", "7", "title"], "x").ok).toBe(false);
  });

  it("writes into a v3 widget's data, addressed by widget id or by the outer row id", () => {
    const byWidget = writeRowsAtPath([v3], ["row", "w1", "widget", "w1", "col", "0", "eyebrow"], "Fresh");
    expect(byWidget.ok).toBe(true);
    expect(widgetData(byWidget.rows[0]).eyebrow).toBe("Fresh");
    const byRow = writeRowsAtPath([v3], ["row", "row9", "widget", "w1", "list", "cards", "0", "title"], "Uno");
    expect(widgetData(byRow.rows[0]).cards?.[0].title).toBe("Uno");
    expect(writeRowsAtPath([v3], ["row", "nope", "widget", "nope", "col", "0", "eyebrow"], "x").ok).toBe(false);
  });
});

describe("fieldPathToNodePath", () => {
  it("maps the legacy field paths the renderers carry", () => {
    expect(fieldPathToNodePath("w1", "rows.3.content.subtitle")).toEqual(["row", "w1", "widget", "w1", "col", "0", "subtitle"]);
    expect(fieldPathToNodePath("w1", "rows.3.columns_data.0.body")).toEqual(["row", "w1", "widget", "w1", "col", "1", "body"]);
    expect(fieldPathToNodePath("w1", "rows.3.content.cards.1.title")).toEqual(["row", "w1", "widget", "w1", "list", "cards", "1", "title"]);
    expect(fieldPathToNodePath("w1", "")).toBeNull();
    expect(fieldPathToNodePath("w1", "rows.3.content.a.b.c.d")).toBeNull();
  });
});
