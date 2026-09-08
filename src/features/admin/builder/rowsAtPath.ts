import type { PageRow } from "@/types/rows";
import type { NodePath } from "./BuilderContext";

type Obj = Record<string, unknown>;
type WidgetLike = { id: string; data?: Obj };
type CellLike = { widgets?: WidgetLike[] };
type ColumnLike = { cells?: CellLike[] };
type RowLike = PageRow & { columns?: ColumnLike[]; columns_data?: Obj[] };

const setLeafOnObject = (obj: Obj, leaf: string, v: string, titleAsLines = true): Obj => {
  if (leaf === "title" && titleAsLines) {
    const lines = v.split(/\n+/).map((x) => x.trim()).filter(Boolean);
    return { ...obj, title_lines: lines.length > 0 ? lines : [v] };
  }
  return { ...obj, [leaf]: v };
};

const LIST_KEYS = ["services", "items", "features", "pillars", "cards", "logos", "steps"];

/** Apply the path remainder to a content object; null when the shape is unknown. */
const applyToContent = (content: Obj, rest: string[], value: string): Obj | null => {
  const leaf = rest[rest.length - 1];
  if (rest[0] === "col" && rest.length >= 3) return setLeafOnObject(content, leaf, value);
  if (rest[0] === "item" && rest.length >= 3) {
    const itemId = rest[1];
    for (const key of LIST_KEYS) {
      const list = content[key];
      if (Array.isArray(list)) {
        const idx = list.findIndex((it) => it && (it as Obj).id === itemId);
        if (idx !== -1) {
          const next = list.slice();
          next[idx] = setLeafOnObject((list[idx] as Obj) || {}, leaf, value, false);
          return { ...content, [key]: next };
        }
      }
    }
    return null;
  }
  if (rest[0] === "list" && rest.length >= 4) {
    const key = rest[1];
    const idx = Number(rest[2]);
    const list = content[key];
    if (!Array.isArray(list) || Number.isNaN(idx) || !list[idx]) return null;
    const next = list.slice();
    next[idx] = setLeafOnObject((list[idx] as Obj) || {}, leaf, value, false);
    return { ...content, [key]: next };
  }
  if (rest[0] === "field" && rest.length >= 2) return setLeafOnObject(content, leaf, value);
  if (rest.length === 1) return setLeafOnObject(content, leaf, value);
  return null;
};

/**
 * Write one text value into the row tree at `path`.
 *
 * Path shapes (after ["row", rowId, "widget", widgetId]):
 *   ["col", i, leaf]            leaf on the i-th column's content
 *   ["item", itemId, leaf]      leaf on a list entry found by its id
 *   ["list", key, index, leaf]  leaf on list `key`'s index-th entry
 *   ["field", leaf] / [leaf]    leaf on the content itself
 *
 * Works for v1 rows (content on the row; extra columns in columns_data)
 * and v3 rows (data on the widget inside columns → cells → widgets).
 * For v3, `rowId` may be the widget's own id (TextRow's convention) or
 * the outer row's id with the widget id in slot 3 (WidgetNode's).
 */
export const writeRowsAtPath = (
  rows: PageRow[],
  path: NodePath,
  value: string,
): { rows: PageRow[]; ok: boolean } => {
  if (path.length < 3 || path[0] !== "row") return { rows, ok: false };
  const rowId = path[1];
  let rest = path.slice(2);
  let widgetId: string | null = null;
  if (rest[0] === "widget") { widgetId = rest[1] ?? null; rest = rest.slice(2); }
  if (rest.length === 0) return { rows, ok: false };

  const rowIdx = rows.findIndex((r) => r.id === rowId);
  const row = rowIdx === -1 ? null : (rows[rowIdx] as RowLike);
  if (row && !Array.isArray(row.columns)) {
    const colIndex = rest[0] === "col" ? Number(rest[1]) : 0;
    if (Number.isNaN(colIndex)) return { rows, ok: false };
    if (colIndex >= 1) {
      const cd = (row.columns_data || []).slice();
      const next = applyToContent(cd[colIndex - 1] || {}, rest, value);
      if (!next) return { rows, ok: false };
      cd[colIndex - 1] = next;
      const nextRows = rows.slice();
      nextRows[rowIdx] = { ...row, columns_data: cd } as PageRow;
      return { rows: nextRows, ok: true };
    }
    const next = applyToContent((row.content as Obj) || {}, rest, value);
    if (!next) return { rows, ok: false };
    const nextRows = rows.slice();
    nextRows[rowIdx] = { ...row, content: next } as PageRow;
    return { rows: nextRows, ok: true };
  }

  const wanted = new Set([widgetId, rowId].filter((x): x is string => !!x));
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] as RowLike;
    if (!Array.isArray(r.columns)) continue;
    let hit = false;
    const columns = r.columns.map((col) => {
      if (!Array.isArray(col.cells)) return col;
      return {
        ...col,
        cells: col.cells.map((cell) => {
          if (!Array.isArray(cell.widgets)) return cell;
          return {
            ...cell,
            widgets: cell.widgets.map((w) => {
              if (hit || !wanted.has(w.id)) return w;
              const next = applyToContent(w.data || {}, rest, value);
              if (!next) return w;
              hit = true;
              return { ...w, data: next };
            }),
          };
        }),
      };
    });
    if (hit) {
      const nextRows = rows.slice();
      nextRows[i] = { ...r, columns } as PageRow;
      return { rows: nextRows, ok: true };
    }
  }
  return { rows, ok: false };
};
