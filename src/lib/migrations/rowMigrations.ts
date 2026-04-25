/**
 * Row schema migrations.
 *
 * Rows have evolved through three shapes:
 *   v1 (`PageRow`)        — single `type` + flat `content` blob, with
 *                           optional `columns_data` for extra columns.
 *   v2 (`PageRowV2`)      — generic columns; each column owns widgets.
 *   v3 (`PageRowV3`)      — columns own *cells*; cells own widgets.
 *
 * The renderers and editors target v3. Use `normalizeRowsToV3` (or
 * `migrateSiteContentRows` for a `{ rows }` envelope) at every entry
 * point that loads stored JSON. All migrations here are idempotent,
 * so running them on already-migrated data is a no-op.
 */

import type {
  ColumnLayoutPreset,
  PageColumn,
  PageRow,
  PageRowV2,
  PageRowV3,
} from "@/types/rows";
import { isPageRowV2, isPageRowV3 } from "@/types/rows";
import { buildEmptyCell, generateRowId } from "@/lib/constants/rowDefaults";

/** Map an array of column widths back to a known preset token. */
const widthsToPreset = (widths: number[]): ColumnLayoutPreset => {
  const key = widths.map((w) => Math.round(w)).join("-");
  const known: Record<string, ColumnLayoutPreset> = {
    "100": "100",
    "50-50": "50-50",
    "33-33-33": "33-33-33",
    "25-25-25-25": "25-25-25-25",
    "60-40": "60-40",
    "40-60": "40-60",
    "70-30": "70-30",
    "30-70": "30-70",
  };
  return known[key] || "custom";
};

/**
 * Lift a legacy `PageRow` into the v2 shape (columns own widgets).
 * The original `content` plus any `columns_data` entries become one
 * widget per column, preserving the row's `type`. Already-v2 (or v3)
 * rows pass through untouched.
 */
export const migrateRowToV2 = (
  row: PageRow | PageRowV2 | PageRowV3,
): PageRowV2 | PageRowV3 => {
  if (isPageRowV2(row)) return row;

  const legacy = row as PageRow;
  const contents = [legacy.content || {}, ...(legacy.columns_data || [])];
  const widths =
    legacy.layout?.column_widths ||
    contents.map(() => Math.round(100 / Math.max(contents.length, 1)));

  const columns: PageColumn[] = contents.map((data) => ({
    id: generateRowId(),
    widgets: [
      {
        id: generateRowId(),
        type: legacy.type,
        data: data || {},
      },
    ],
  }));

  return {
    id: legacy.id,
    schema_version: 2,
    strip_title: legacy.strip_title,
    bg_color: legacy.bg_color,
    scope: legacy.scope,
    layout: legacy.layout,
    column_layout: widthsToPreset(widths),
    columns,
  };
};

/**
 * Promote any row shape (v1 / v2 / v3) into v3, where columns own
 * cells and cells own widgets. v3 input is returned as-is. v2 columns
 * are wrapped so each column's widgets become a single default cell.
 */
export const migrateRowToV3 = (
  row: PageRow | PageRowV2 | PageRowV3,
): PageRowV3 => {
  if (isPageRowV3(row)) return row;
  const v2 = migrateRowToV2(row) as PageRowV2;

  const columns: PageColumn[] = v2.columns.map((col) => {
    if (Array.isArray((col as any).cells) && (col as any).cells.length > 0) {
      return {
        id: col.id,
        cell_direction: (col as any).cell_direction || "vertical",
        cells: (col as any).cells,
      };
    }
    return {
      id: col.id,
      cell_direction: "vertical",
      cells: [
        {
          ...buildEmptyCell(),
          widgets: col.widgets || [],
        },
      ],
    };
  });

  return {
    id: v2.id,
    schema_version: 3,
    strip_title: v2.strip_title,
    bg_color: v2.bg_color,
    scope: v2.scope,
    layout: v2.layout,
    column_layout: v2.column_layout,
    columns,
    customCss: (row as any).customCss,
  };
};

/**
 * Normalize an array of rows of any vintage into v3. Call this once at
 * each entry point that loads stored JSON so downstream code can rely
 * on `PageRowV3` everywhere.
 */
export const normalizeRowsToV3 = (
  rows: any[] | null | undefined,
): PageRowV3[] => {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => migrateRowToV3(r));
};

/**
 * Migrate a `site_content`-style payload `{ rows: [...] }` in place,
 * returning a new envelope with v3-normalized rows. Safe on already
 * migrated payloads; no-op when `rows` is missing.
 */
export const migrateSiteContentRows = <T extends { rows?: any[] } | null | undefined>(
  payload: T,
): T => {
  if (!payload || !Array.isArray((payload as any).rows)) return payload;
  const migrated = (payload as any).rows.map((r: any) => migrateRowToV3(r));
  return { ...(payload as any), rows: migrated } as T;
};
