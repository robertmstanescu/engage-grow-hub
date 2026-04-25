/**
 * widgetLocator — resolve a widget-id to its location in the page tree.
 *
 * ════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS — Debug Story 1.1 ("Sibling Erasure Test")
 * ════════════════════════════════════════════════════════════════════
 * The Inspector receives a selection id like `widget:<widgetId>` from
 * the canvas. In the legacy v1 row schema one widget == one row, so
 * `pageRows.find(r => r.id === widgetId)` was sufficient.
 *
 * In v2/v3 rows a SINGLE row contains MANY widgets nested under
 * `row.columns[].cells[].widgets[]`. Each `PageWidget` has its own id.
 * Looking it up by row id only would either miss the click entirely or
 * (much worse) match an unrelated row and overwrite the wrong content.
 *
 * Concretely, a 1-column layout with two widgets ("Widget A" + Image)
 * shipped to the inspector as `widget:<aId>` would route updates
 * through `pageRows.map(r => r.id === aId ? { ...r, content: …new })`
 * — replacing the ROW's content blob and ERASING the sibling widget.
 *
 * This module makes the lookup unambiguous and the writes surgical:
 *   • findWidgetLocation(rows, widgetId) returns either:
 *       { kind: "legacy", rowIdx }                        v1 single-widget rows
 *     or
 *       { kind: "v3", rowIdx, colIdx, cellIdx, widgetIdx } v2/v3 nested widgets
 *   • patchWidget(rows, loc, fn) returns a NEW rows array with only the
 *     targeted widget mutated through `fn(widget) -> nextWidget`. Every
 *     ancestor and every sibling array is shallow-cloned so React diffs
 *     correctly and no sibling can ever be dropped on the floor.
 *
 * Both helpers are pure: they never mutate the input arrays.
 * ──────────────────────────────────────────────────────────────────── */

import type { PageRow } from "@/types/rows";
import { isPageRowV2 } from "@/types/rows";

export type WidgetLocation =
  | { kind: "legacy"; rowIdx: number }
  | {
      kind: "v3";
      rowIdx: number;
      colIdx: number;
      /** -1 when widgets live directly on the column (v2 with no cells). */
      cellIdx: number;
      widgetIdx: number;
    };

/**
 * Search the entire row tree for `widgetId`. Returns the FIRST match,
 * which is fine because widget ids are generated via `generateRowId`
 * and assumed unique.
 */
export const findWidgetLocation = (
  rows: PageRow[],
  widgetId: string,
): WidgetLocation | null => {
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx] as any;

    // v2/v3 — walk columns → (optional cells) → widgets.
    if (isPageRowV2(row)) {
      const cols = (row.columns || []) as any[];
      for (let colIdx = 0; colIdx < cols.length; colIdx++) {
        const col = cols[colIdx];
        const cells = Array.isArray(col?.cells) ? col.cells : null;
        if (cells && cells.length > 0) {
          for (let cellIdx = 0; cellIdx < cells.length; cellIdx++) {
            const widgets = (cells[cellIdx]?.widgets || []) as any[];
            const widgetIdx = widgets.findIndex((w) => w?.id === widgetId);
            if (widgetIdx !== -1) {
              return { kind: "v3", rowIdx, colIdx, cellIdx, widgetIdx };
            }
          }
        } else {
          // v2 — widgets directly on the column.
          const widgets = (col?.widgets || []) as any[];
          const widgetIdx = widgets.findIndex((w) => w?.id === widgetId);
          if (widgetIdx !== -1) {
            return { kind: "v3", rowIdx, colIdx, cellIdx: -1, widgetIdx };
          }
        }
      }
      // Fall through — v2 row may also coincidentally have row.id ===
      // widgetId from legacy data; let the legacy branch below catch it.
    }

    // v1 / legacy — one widget per row.
    if (row?.id === widgetId) {
      return { kind: "legacy", rowIdx };
    }
  }
  return null;
};

/**
 * Read the widget data blob at a resolved location. For v1 rows the
 * "widget data" is the row's own `content`; for v2/v3 rows it is the
 * `PageWidget.data` blob inside the cell.
 */
export const readWidgetContent = (
  rows: PageRow[],
  loc: WidgetLocation,
): Record<string, any> => {
  if (loc.kind === "legacy") return rows[loc.rowIdx]?.content || {};
  const row = rows[loc.rowIdx] as any;
  const col = row.columns[loc.colIdx];
  if (loc.cellIdx === -1) {
    return col.widgets[loc.widgetIdx]?.data || {};
  }
  return col.cells[loc.cellIdx].widgets[loc.widgetIdx]?.data || {};
};

/**
 * Read the widget TYPE at a resolved location. v1 rows store this on
 * `row.type`; v2/v3 widgets carry their own `type`.
 */
export const readWidgetType = (
  rows: PageRow[],
  loc: WidgetLocation,
): string => {
  if (loc.kind === "legacy") return rows[loc.rowIdx]?.type || "";
  const row = rows[loc.rowIdx] as any;
  const col = row.columns[loc.colIdx];
  if (loc.cellIdx === -1) {
    return col.widgets[loc.widgetIdx]?.type || "";
  }
  return col.cells[loc.cellIdx].widgets[loc.widgetIdx]?.type || "";
};

/**
 * Return a NEW rows array where only the widget at `loc` is replaced
 * with `fn(prevContent)`. Every container array on the path is shallow-
 * cloned so sibling references survive untouched — the whole point of
 * this module is that updating one widget can NEVER drop another.
 *
 * For v1 rows, `fn` patches `row.content` (the row IS the widget).
 * For v2/v3 rows, `fn` patches `widget.data` (the cell holds the widget).
 */
export const patchWidgetContent = (
  rows: PageRow[],
  loc: WidgetLocation,
  fn: (prev: Record<string, any>) => Record<string, any>,
): PageRow[] => {
  if (loc.kind === "legacy") {
    const next = rows.slice();
    const row = rows[loc.rowIdx];
    next[loc.rowIdx] = { ...row, content: fn(row.content || {}) } as PageRow;
    return next;
  }

  const next = rows.slice();
  const row = rows[loc.rowIdx] as any;
  const cols = row.columns.slice();
  const col = { ...cols[loc.colIdx] };

  if (loc.cellIdx === -1) {
    const widgets = (col.widgets || []).slice();
    const w = widgets[loc.widgetIdx];
    widgets[loc.widgetIdx] = { ...w, data: fn(w.data || {}) };
    col.widgets = widgets;
  } else {
    const cells = (col.cells || []).slice();
    const cell = { ...cells[loc.cellIdx] };
    const widgets = (cell.widgets || []).slice();
    const w = widgets[loc.widgetIdx];
    widgets[loc.widgetIdx] = { ...w, data: fn(w.data || {}) };
    cell.widgets = widgets;
    cells[loc.cellIdx] = cell;
    col.cells = cells;
  }

  cols[loc.colIdx] = col;
  next[loc.rowIdx] = { ...row, columns: cols } as PageRow;
  return next;
};

/**
 * Remove the widget at `loc`. For v1 the entire row is removed (one
 * widget == one row). For v2/v3 the widget is spliced out of its
 * containing cell/column; the row stays so its other widgets remain
 * editable.
 */
export const removeWidgetAt = (
  rows: PageRow[],
  loc: WidgetLocation,
): PageRow[] => {
  if (loc.kind === "legacy") {
    return rows.filter((_, i) => i !== loc.rowIdx);
  }
  const next = rows.slice();
  const row = rows[loc.rowIdx] as any;
  const cols = row.columns.slice();
  const col = { ...cols[loc.colIdx] };

  if (loc.cellIdx === -1) {
    const widgets = (col.widgets || []).slice();
    widgets.splice(loc.widgetIdx, 1);
    col.widgets = widgets;
  } else {
    const cells = (col.cells || []).slice();
    const cell = { ...cells[loc.cellIdx] };
    const widgets = (cell.widgets || []).slice();
    widgets.splice(loc.widgetIdx, 1);
    cell.widgets = widgets;
    cells[loc.cellIdx] = cell;
    col.cells = cells;
  }

  cols[loc.colIdx] = col;
  next[loc.rowIdx] = { ...row, columns: cols } as PageRow;
  return next;
};
