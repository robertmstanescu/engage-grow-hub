import type { RowLayout } from "@/types/rows";

/**
 * rowHeight — one place that turns the admin's "Height" choice for a row
 * into a CSS min-height.
 *
 * WHY min-height and not height: a row must never clip its own content.
 * The setting reserves space (so an image band or a statement row can be
 * deliberately tall) while long content is still free to grow past it.
 */

export type RowHeightMode = "auto" | "small" | "medium" | "large" | "full" | "custom";

/** Preset heights, expressed in viewport units so they scale with the screen. */
const PRESETS: Record<Exclude<RowHeightMode, "auto" | "custom" | "full">, string> = {
  small: "35vh",
  medium: "55vh",
  large: "75vh",
};

export const ROW_HEIGHT_MODES: [RowHeightMode, string][] = [
  ["auto", "Auto"],
  ["small", "Small"],
  ["medium", "Medium"],
  ["large", "Large"],
  ["full", "Full screen"],
  ["custom", "Custom"],
];

/**
 * Returns the CSS value for `min-height`, or `undefined` when the row
 * should size itself to its content (the default).
 */
export const resolveRowMinHeight = (layout?: Partial<RowLayout>): string | undefined => {
  const mode = (layout?.heightMode as RowHeightMode | undefined) ?? "auto";
  if (mode === "auto") return undefined;
  if (mode === "full") return "calc(100dvh - var(--nav-top-offset, 0px))";
  if (mode === "custom") {
    const value = Number(layout?.heightValue ?? 0);
    if (!value || value <= 0) return undefined;
    const unit = layout?.heightUnit === "px" ? "px" : "vh";
    return `${value}${unit}`;
  }
  return PRESETS[mode];
};
