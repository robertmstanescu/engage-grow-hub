import type { PageRow, RowLayout } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/types/rows";
import { buildGradientCSS } from "@/components/admin/site-editor/GradientEditor";

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

/**
 * Returns the decorative background CSS for a row.
 * - If a custom `layout.gradient` is enabled → returns that gradient (replaces legacy decoration).
 * - Otherwise → returns the row-type-specific legacy radial-gradient string built from
 *   `layout.gradientStart` / `layout.gradientEnd` (with sensible defaults per row type).
 *
 * The caller renders this on the absolute-inset overlay <div>.
 */
export const getRowBackgroundCSS = (
  row: PageRow,
  legacyBuilder: (gradStart: string, gradEnd: string) => string,
  defaults: { start: string; end: string },
): string => {
  const l: RowLayout = { ...DEFAULT_ROW_LAYOUT, ...row.layout };
  if (l.gradient?.enabled && l.gradient.stops?.length >= 2) {
    return buildGradientCSS(l.gradient);
  }
  const gradStart = l.gradientStart || defaults.start;
  const gradEnd = l.gradientEnd || defaults.end;
  return legacyBuilder(gradStart, gradEnd);
};

/** Effective bg color with opacity applied (for `backgroundColor` style). */
export const getRowBgColor = (row: PageRow, fallback?: string): string | undefined => {
  const opacity = row.layout?.bgColorOpacity ?? 100;
  return applyColorOpacity(row.bg_color || fallback, opacity);
};

/** Inline style for the row's background image (returns {} if no image). */
export const getRowBgImageStyle = (row: PageRow): React.CSSProperties => {
  const url = row.layout?.bgImage;
  if (!url) return {};
  const opacity = row.layout?.bgImageOpacity ?? 100;
  // Apply opacity by overlaying a same-color veil; simplest: use `image-set` is overkill. Use inline image as background with rgba mask.
  // Most reliable cross-browser: composite a linear-gradient white→white with controlled alpha over the image.
  if (opacity >= 100) {
    return { backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center" };
  }
  const veilAlpha = (100 - opacity) / 100;
  return {
    backgroundImage: `linear-gradient(rgba(0,0,0,${veilAlpha}), rgba(0,0,0,${veilAlpha})), url(${url})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundBlendMode: "normal",
  };
};

/**
 * Resolve the legacy gradient defaults a row uses, so the GradientEditor
 * can pre-populate its stops with what's actually rendering on the page.
 */
export const ROW_GRADIENT_DEFAULTS: Record<string, { start: string; end: string }> = {
  hero: { start: "hsl(280 55% 20% / 0.8)", end: "hsl(286 42% 25% / 0.5)" },
  text: { start: "hsl(280 55% 18% / 0.5)", end: "hsl(286 42% 20% / 0.3)" },
  service: { start: "hsl(286 42% 30%)", end: "hsl(280 55% 25%)" },
  boxed: { start: "hsl(280 55% 18% / 0.6)", end: "hsl(286 42% 20% / 0.4)" },
  contact: { start: "hsl(280 55% 24% / 0.3)", end: "transparent" },
  image_text: { start: "hsl(280 55% 20% / 0.5)", end: "hsl(286 42% 25% / 0.3)" },
  profile: { start: "hsl(280 55% 20% / 0.5)", end: "hsl(286 42% 25% / 0.3)" },
  grid: { start: "hsl(280 55% 20% / 0.5)", end: "hsl(286 42% 25% / 0.3)" },
};
