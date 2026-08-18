import type { PageRow } from "@/types/rows";
import { pickForeground } from "@/lib/pickForeground";

/**
 * resolveRowBgColor
 *
 * A row has exactly one possible background: the plain `bg_color` an
 * admin picked in the Style tab. When it has none it is transparent and
 * the page mesh shows through, so there is nothing to resolve.
 */
export const resolveRowBgColor = (row: PageRow): string | undefined => row.bg_color || undefined;

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
