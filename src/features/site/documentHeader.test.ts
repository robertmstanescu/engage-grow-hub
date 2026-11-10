import { describe, expect, it } from "vitest";
import { splitDocumentHeader } from "./documentHeader";
import type { PageRow } from "@/types/rows";

const textRow = (data: Record<string, unknown>, type = "text") =>
  ({ id: "r1", columns: [{ cells: [{ widgets: [{ id: "w1", type, data }] }] }] }) as unknown as PageRow;

describe("splitDocumentHeader", () => {
  it("lifts the heading out and leaves the body in the block", () => {
    const rows = [textRow({ eyebrow: "Legal", title_lines: ["<p>Privacy Policy</p>"], subtitle: "Last updated", body: "<p>Body</p>" })];
    const out = splitDocumentHeader(rows);
    expect(out.header).toEqual({ eyebrow: "Legal", titleLines: ["<p>Privacy Policy</p>"], subtitle: "Last updated" });
    const data = (out.rows[0] as unknown as { columns: { cells: { widgets: { data: unknown }[] }[] }[] }).columns[0].cells[0].widgets[0].data;
    expect(data).toMatchObject({ eyebrow: "", title_lines: [], subtitle: "", body: "<p>Body</p>" });
  });

  it("never changes the rows it was given", () => {
    const rows = [textRow({ eyebrow: "Legal", title_lines: ["Privacy"], body: "x" })];
    const before = JSON.stringify(rows);
    splitDocumentHeader(rows);
    expect(JSON.stringify(rows)).toBe(before);
  });

  it("leaves the page alone when there is no title", () => {
    const rows = [textRow({ eyebrow: "Legal", title_lines: ["<p> </p>"], body: "x" })];
    expect(splitDocumentHeader(rows)).toEqual({ header: null, rows });
  });

  it("leaves the page alone when the first block is not text", () => {
    const rows = [textRow({ title_lines: ["A"] }, "boxed")];
    expect(splitDocumentHeader(rows).header).toBeNull();
  });

  it("survives empty, null and malformed rows", () => {
    expect(splitDocumentHeader([]).header).toBeNull();
    expect(splitDocumentHeader([null as unknown as PageRow]).header).toBeNull();
    expect(splitDocumentHeader([{ columns: "x" } as unknown as PageRow]).header).toBeNull();
    expect(splitDocumentHeader([textRow({ title_lines: [null, 4, "Real"] })]).header?.titleLines).toEqual(["Real"]);
  });
});
