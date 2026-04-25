import type { PageRow } from "@/types/rows";

/**
 * Count "configured widgets" inside a legacy `PageRow`.
 *
 * A row in the legacy schema holds one cell in `content` plus zero or
 * more extra cells in `columns_data`. Each cell is one widget slot.
 *
 * For Debug Story 4.1 ("destructive action guard") we want to warn the
 * user only when deleting a row would actually destroy meaningful work.
 * So we count cells that have at least one user-authored field — empty
 * cells (created by adding a column but never filled in) and cells that
 * contain only internal bookkeeping keys (`__design`, `__global_ref`)
 * are NOT counted.
 *
 * For widget-typed rows (image, contact, hero, etc.) the row itself is
 * already a widget, so we count the row as 1 even when its content is
 * partly filled in — that's still meaningful work the user would lose.
 */
const INTERNAL_KEY_PREFIXES = ["__"];

const isInternalKey = (k: string) => INTERNAL_KEY_PREFIXES.some((p) => k.startsWith(p));

const cellHasContent = (cell: Record<string, any> | null | undefined): boolean => {
  if (!cell || typeof cell !== "object") return false;
  for (const k of Object.keys(cell)) {
    if (isInternalKey(k)) continue;
    const v = (cell as any)[k];
    if (v === null || v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    return true;
  }
  return false;
};

/**
 * Returns the number of configured widgets in a row. Always ≥ 1 for
 * rows that exist — even an "empty" row counts as 1 unit of work the
 * user laid out (and may want to be warned about for high-value
 * widget types like contact forms which start mostly empty).
 */
export const countRowWidgets = (row: PageRow): number => {
  const cells = [row.content, ...(row.columns_data || [])];
  const filled = cells.filter(cellHasContent).length;
  // Always report at least 1 so the row's own widget type is acknowledged.
  return Math.max(filled, 1);
};
