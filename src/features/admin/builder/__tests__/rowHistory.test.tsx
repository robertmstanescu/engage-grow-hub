import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useRowHistory } from "../useRowHistory";
import type { PageRow } from "@/types/rows";

const r = (id: string): PageRow => ({ id, type: "text", content: {} } as PageRow);

describe("useRowHistory", () => {
  it("records each change and undoes/redoes through the adapter's setter", () => {
    vi.useFakeTimers();
    let rows: PageRow[] = [r("a")];
    const setter = vi.fn((next: PageRow[]) => { rows = next; });
    const { result, rerender } = renderHook(() => useRowHistory(rows, setter, { coalesceMs: 100, keyboard: false }));

    act(() => result.current.change([r("a"), r("b")]));
    rerender();
    vi.advanceTimersByTime(200);
    act(() => result.current.change([r("a"), r("b"), r("c")]));
    rerender();
    expect(rows.map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(result.current.canUndo).toBe(true);

    act(() => { result.current.undo(); });
    rerender();
    expect(rows.map((x) => x.id)).toEqual(["a", "b"]);
    act(() => { result.current.undo(); });
    rerender();
    expect(rows.map((x) => x.id)).toEqual(["a"]);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
    act(() => { result.current.redo(); });
    rerender();
    expect(rows.map((x) => x.id)).toEqual(["a", "b"]);
    vi.useRealTimers();
  });

  it("merges a burst of quick changes into one undo step", () => {
    vi.useFakeTimers();
    let rows: PageRow[] = [r("a")];
    const setter = vi.fn((next: PageRow[]) => { rows = next; });
    const { result, rerender } = renderHook(() => useRowHistory(rows, setter, { coalesceMs: 500, keyboard: false }));
    for (const id of ["b", "c", "d"]) { act(() => result.current.change([...rows, r(id)])); rerender(); vi.advanceTimersByTime(50); }
    expect(rows).toHaveLength(4);
    act(() => { result.current.undo(); });
    rerender();
    expect(rows.map((x) => x.id)).toEqual(["a"]);
    expect(result.current.canUndo).toBe(false);
    vi.useRealTimers();
  });
});
