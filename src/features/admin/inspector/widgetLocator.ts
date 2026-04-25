/**
 * widgetLocator — resolve a widget-id to its location in the page tree.
 *
 * ════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS — Debug Story 1.1 ("Sibling Erasure Test")
 * ════════════════════════════════════════════════════════════════════
 * The Inspector receives a selection id like `widget:<widgetId>` from
 * the canvas. A SINGLE row contains MANY widgets nested under
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
 *   • findWidgetLocation(rows, widgetId) returns:
 *       { rowIdx, colIdx, cellIdx, widgetIdx }
 *   • patchWidget(rows, loc, fn) returns a NEW rows array with only the
 *     targeted widget mutated through `fn(widget) -> nextWidget`. Every
 *     ancestor and every sibling array is shallow-cloned so React diffs
 *     correctly and no sibling can ever be dropped on the floor.
 *
 * ════════════════════════════════════════════════════════════════════
 * US 2.2 — V1/V2 LEGACY BRANCHES REMOVED
 * ════════════════════════════════════════════════════════════════════
 * This module now assumes 100% PageRowV3 (Atomic Node Tree) compliance.
 * Callers MUST pass v3 rows; `normalizeRowsToV3()` runs at every read
 * boundary (SiteEditor, CmsPageBuilder, AdminDashboard, RowsRenderer)
 * so this invariant is guaranteed.
 *
 * Both helpers are pure: they never mutate the input arrays.
 * ──────────────────────────────────────────────────────────────────── */

import type { PageRow } from "@/types/rows";

export interface WidgetLocation {
  rowIdx: number;
  colIdx: number;
  cellIdx: number;
  widgetIdx: number;
}

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
    const cols = (row?.columns || []) as any[];
    for (let colIdx = 0; colIdx < cols.length; colIdx++) {
      const cells = (cols[colIdx]?.cells || []) as any[];
      for (let cellIdx = 0; cellIdx < cells.length; cellIdx++) {
        const widgets = (cells[cellIdx]?.widgets || []) as any[];
        const widgetIdx = widgets.findIndex((w) => w?.id === widgetId);
        if (widgetIdx !== -1) {
          return { rowIdx, colIdx, cellIdx, widgetIdx };
        }
      }
    }
  }
  return null;
};

/** Read the widget data blob at a resolved location. */
export const readWidgetContent = (
  rows: PageRow[],
  loc: WidgetLocation,
): Record<string, any> => {
  const row = rows[loc.rowIdx] as any;
  return row?.columns?.[loc.colIdx]?.cells?.[loc.cellIdx]?.widgets?.[loc.widgetIdx]?.data || {};
};

/** Read the widget TYPE at a resolved location. */
export const readWidgetType = (
  rows: PageRow[],
  loc: WidgetLocation,
): string => {
  const row = rows[loc.rowIdx] as any;
  return row?.columns?.[loc.colIdx]?.cells?.[loc.cellIdx]?.widgets?.[loc.widgetIdx]?.type || "";
};

/**
 * Return a NEW rows array where only the widget at `loc` is replaced
 * with `fn(prevContent)`. Every container array on the path is shallow-
 * cloned so sibling references survive untouched — the whole point of
 * this module is that updating one widget can NEVER drop another.
 */
export const patchWidgetContent = (
  rows: PageRow[],
  loc: WidgetLocation,
  fn: (prev: Record<string, any>) => Record<string, any>,
): PageRow[] => {
  const next = rows.slice();
  const row = rows[loc.rowIdx] as any;
  const cols = row.columns.slice();
  const col = { ...cols[loc.colIdx] };
  const cells = (col.cells || []).slice();
  const cell = { ...cells[loc.cellIdx] };
  const widgets = (cell.widgets || []).slice();
  const w = widgets[loc.widgetIdx];
  widgets[loc.widgetIdx] = { ...w, data: fn(w.data || {}) };
  cell.widgets = widgets;
  cells[loc.cellIdx] = cell;
  col.cells = cells;
  cols[loc.colIdx] = col;
  next[loc.rowIdx] = { ...row, columns: cols } as PageRow;
  return next;
};

/**
 * Remove the widget at `loc`. The widget is spliced out of its
 * containing cell; the row stays so its other widgets remain editable.
 */
export const removeWidgetAt = (
  rows: PageRow[],
  loc: WidgetLocation,
): PageRow[] => {
  const next = rows.slice();
  const row = rows[loc.rowIdx] as any;
  const cols = row.columns.slice();
  const col = { ...cols[loc.colIdx] };
  const cells = (col.cells || []).slice();
  const cell = { ...cells[loc.cellIdx] };
  const widgets = (cell.widgets || []).slice();
  widgets.splice(loc.widgetIdx, 1);
  cell.widgets = widgets;
  cells[loc.cellIdx] = cell;
  col.cells = cells;
  cols[loc.colIdx] = col;
  next[loc.rowIdx] = { ...row, columns: cols } as PageRow;
  return next;
};
