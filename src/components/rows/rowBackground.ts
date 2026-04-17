import type { PageRow, RowLayout } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/types/rows";
import { buildGradientCSS } from "@/components/admin/site-editor/GradientEditor";

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
