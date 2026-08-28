import type { PageRow, PageRowV2, PageRowV3, PageWidget, WidgetType } from "@/types/rows";
import { isPageRowV2 } from "@/types/rows";

/**
 * Widget traversal helpers for `page_rows` / `draft_page_rows` content.
 *
 * A row on this site can be shaped 3 different ways depending on when it
 * was last saved (see `src/lib/migrations/rowMigrations.ts` for the full
 * history):
 *   v1 — the row itself IS the widget: `{ id, type, content }`
 *   v2 — `row.columns[].widgets[]`
 *   v3 — `row.columns[].cells[].widgets[]` (current/canonical shape)
 *
 * Every renderer reads through `normalizeRowsToV3` first, so components
 * never see anything but v3. Code OUTSIDE the render path — admin
 * tooling, one-off content migrations — talks to the raw, possibly
 * un-normalized JSON straight from the database, and has to handle all
 * 3 shapes itself. Hand-rolling that walk is easy to get subtly wrong:
 * an earlier Supabase migration assumed the v1 shape for live content
 * that was actually v3, matched nothing, and silently no-op'd. Use
 * these helpers instead of re-deriving the traversal.
 *
 * The equivalent for a raw SQL migration is the `public.merge_widget_data_by_type`
 * Postgres function (installed by the migration alongside this file) —
 * use THAT for changes made directly in the database; use the functions
 * below for changes made in application/admin code.
 */

type AnyRow = PageRow | PageRowV2 | PageRowV3;

/** Every widget of a given type across a row array, any schema version. */
export const findWidgetsByType = <T extends WidgetType>(
  rows: AnyRow[],
  type: T,
): PageWidget<T>[] => {
  const found: PageWidget<T>[] = [];
  for (const row of rows) {
    if (!isPageRowV2(row)) {
      // v1: the row itself is the widget.
      if (row.type === type) {
        found.push({ id: row.id, type, data: row.content } as PageWidget<T>);
      }
      continue;
    }
    for (const col of row.columns) {
      const widgetLists: PageWidget[][] = col.cells
        ? col.cells.map((cell) => cell.widgets)
        : col.widgets
          ? [col.widgets]
          : [];
      for (const widgets of widgetLists) {
        for (const w of widgets) {
          if (w.type === type) found.push(w as PageWidget<T>);
        }
      }
    }
  }
  return found;
};

/**
 * Immutable update: returns a NEW row array with `patch` shallow-merged
 * into the data/content of every widget matching `type`. Every other
 * widget, cell, column, and row — including rows with no `columns` at
 * all — comes back as the SAME object reference, so this is cheap to
 * diff and safe to call even when you don't know in advance whether a
 * match exists.
 */
export const mergeWidgetDataByType = <T extends WidgetType>(
  rows: AnyRow[],
  type: T,
  patch: Record<string, unknown>,
): AnyRow[] =>
  rows.map((row) => {
    if (!isPageRowV2(row)) {
      // v1: the row itself is the widget.
      if (row.type === type) {
        return { ...row, content: { ...row.content, ...patch } };
      }
      return row;
    }
    return {
      ...row,
      columns: row.columns.map((col) => {
        if (col.cells) {
          return {
            ...col,
            cells: col.cells.map((cell) => ({
              ...cell,
              widgets: cell.widgets.map((w) => (w.type === type ? { ...w, data: { ...w.data, ...patch } } : w)),
            })),
          };
        }
        if (col.widgets) {
          return {
            ...col,
            widgets: col.widgets.map((w) => (w.type === type ? { ...w, data: { ...w.data, ...patch } } : w)),
          };
        }
        return col;
      }),
    };
  });
