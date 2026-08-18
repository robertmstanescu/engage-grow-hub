import type { PageRow } from "@/types/rows";

/**
 * rowBackground — the ONE thing a row can paint: a flat colour.
 *
 * The site has a single background: the fixed page mesh (see
 * `.page-mesh-layer` in index.css), whose colours are owned by the Hero
 * row. Every other row is transparent unless an admin picks a plain
 * colour for it in the Style tab. There are deliberately no per-row
 * gradients, glows or background images any more — they stacked extra
 * tints on top of the page mesh and made the design impossible to
 * reason about from the admin panel.
 */

/** Convert hex (#RRGGBB or #RGB) → rgba() with given 0-100 opacity. Pass-through for non-hex. */
export const applyColorOpacity = (color: string | undefined, opacity = 100): string | undefined => {
  if (!color) return color;
  if (opacity >= 100) return color;
  const a = Math.max(0, Math.min(100, opacity)) / 100;
  let hex = color.trim();
  if (hex.startsWith("#")) {
    hex = hex.slice(1);
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  }
  return color;
};

/** Effective bg color with opacity applied (for `backgroundColor` style). */
export const getRowBgColor = (row: PageRow, fallback?: string): string | undefined => {
  const opacity = row.layout?.bgColorOpacity ?? 100;
  return applyColorOpacity(row.bg_color || fallback, opacity);
};
