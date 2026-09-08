import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import RowStyleTab from "../RowStyleTab";
import type { PageRow } from "@/types/rows";

vi.mock("@/hooks/useBrandSettings", () => ({
  useBrandColors: () => [{ id: "ink", name: "Ink", hex: "#26142E" }, { id: "gold", name: "Eliza gold", hex: "#E6C24C" }],
}));
vi.mock("../../ImagePickerField", () => ({ default: () => <div data-testid="image-picker" /> }));
vi.mock("../../site-editor/OverlayEditor", () => ({ default: () => null, renderOverlayElements: () => null }));
vi.mock("../../site-editor/RowAlignmentSettings", () => ({ default: () => null }));
vi.mock("../../site-editor/ColumnWidthControl", () => ({ default: () => null }));

const row = (o: Partial<PageRow> = {}): PageRow => ({ id: "r", type: "text", content: {}, ...o } as PageRow);

describe("RowStyleTab", () => {
  it("opens with the four Looks and the five everyday controls, everything else behind Show all", () => {
    render(<RowStyleTab row={row()} onRowMetaChange={() => {}} onUpdateColumnWidths={() => {}} />);
    expect(screen.getAllByRole("radio", { name: /plain|card|band|cover/i })).toHaveLength(4);
    expect(screen.getByRole("radio", { name: "Plain" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radiogroup", { name: "Text tone" })).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Rounded top corners" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Edge shape" })).toBeTruthy();
    expect(screen.getByRole("radiogroup", { name: "Height" })).toBeTruthy();
    const more = document.querySelector("[data-style-show-all]") as HTMLDetailsElement;
    expect(more.open).toBe(false);
    expect(screen.getByText("Surface")).toBeTruthy();
  });

  it("choosing Card writes a colour and rounded corners; Text tone writes layout.textTone", () => {
    const onRowMetaChange = vi.fn();
    render(<RowStyleTab row={row()} onRowMetaChange={onRowMetaChange} onUpdateColumnWidths={() => {}} />);
    fireEvent.click(screen.getByRole("radio", { name: "Card" }));
    expect(onRowMetaChange).toHaveBeenLastCalledWith(expect.objectContaining({ bg_color: "#FFFFFF", layout: expect.objectContaining({ surfaceRadius: "medium" }) }));
    fireEvent.click(screen.getByRole("radio", { name: "Light" }));
    expect(onRowMetaChange).toHaveBeenLastCalledWith(expect.objectContaining({ layout: expect.objectContaining({ textTone: "light" }) }));
  });

  it("shows the page background panel only on a hero row", () => {
    const { unmount } = render(<RowStyleTab row={row({ type: "hero" })} onRowMetaChange={() => {}} onUpdateColumnWidths={() => {}} />);
    expect(screen.getByText("Page background (whole page)")).toBeTruthy();
    unmount();
    render(<RowStyleTab row={row()} onRowMetaChange={() => {}} onUpdateColumnWidths={() => {}} />);
    expect(screen.queryByText("Page background (whole page)")).toBeNull();
  });
});
