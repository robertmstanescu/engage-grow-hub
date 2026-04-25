import type { PageRow } from "@/types/rows";
import { pickForeground } from "@/lib/pickForeground";
import { ROW_GRADIENT_DEFAULTS } from "@/features/site/rows/rowBackground";

/**
 * resolveRowBgColor
 *
 * Picks the most representative background colour for a row, in order:
 *   1. Explicit `row.bg_color` (admin-set in the Style tab).
 *   2. First stop of a custom gradient if `layout.gradient.enabled`.
 *   3. `layout.gradientStart` legacy field.
 *   4. The row-type default `start` colour from ROW_GRADIENT_DEFAULTS.
 *
 * This is what we feed to `pickForeground` so titles/bodies pick a
 * readable colour automatically.
 */
export const resolveRowBgColor = (row: PageRow): string | undefined => {
  if (row.bg_color) return row.bg_color;
  const gradient = row.layout?.gradient;
  if (gradient?.enabled && gradient.stops && gradient.stops.length > 0) {
    return gradient.stops[0]?.color;
  }
  if (row.layout?.gradientStart) return row.layout.gradientStart;
  return ROW_GRADIENT_DEFAULTS[row.type]?.start;
};

/**
 * resolveRowForeground
 *
 * Returns the hex colour that text inside this row should use by default
 * so it remains readable against the row's effective background.
 *
 * Components consume this via the `--row-fg` CSS variable that
 * `RowSection` sets on the `<section>` wrapper. Per-row admin overrides
 * (passed as the `color` prop on RowTitle/Subtitle/Body) still win.
 */
export const resolveRowForeground = (row: PageRow): string => {
  return pickForeground(resolveRowBgColor(row));
};
