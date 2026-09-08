import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PageBackgroundForRows } from "../PageBackgroundPanel";
import { DEFAULT_PAGE_MESH, findHeroRow } from "@/features/site/pageMesh";
import type { PageRow } from "@/types/rows";

const hero = { id: "h1", type: "hero", content: {}, layout: { mesh: { ...DEFAULT_PAGE_MESH, strength: 40 } } } as unknown as PageRow;
const text = { id: "t1", type: "text", content: { body: "x" } } as unknown as PageRow;
const heroV3 = {
  id: "h3",
  schema_version: 3,
  columns: [{ id: "c", cells: [{ id: "ce", widgets: [{ id: "w", type: "hero", data: {} }] }] }],
} as unknown as PageRow;

describe("PageBackgroundForRows", () => {
  it("finds the hero row and writes the mesh back onto it", () => {
    expect(findHeroRow([text, hero])?.id).toBe("h1");
    expect(findHeroRow([text, heroV3])?.id).toBe("h3");
    const onRowsChange = vi.fn();
    render(<PageBackgroundForRows rows={[text, hero]} onRowsChange={onRowsChange} />);
    fireEvent.click(screen.getByText("Lively"));
    const rows = onRowsChange.mock.calls[0][0] as PageRow[];
    expect(rows[0]).toBe(text);
    expect(rows[1]?.layout?.mesh).toEqual({ ...DEFAULT_PAGE_MESH, strength: 40, motion: "lively" });
  });
  it("explains itself when the page has no hero", () => {
    render(<PageBackgroundForRows rows={[text]} onRowsChange={vi.fn()} />);
    expect(screen.getByText(/Add a Hero row/)).toBeTruthy();
  });
});
