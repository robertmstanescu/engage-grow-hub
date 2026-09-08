/**
 * Row Looks — the four everyday presets the Style tab opens with.
 *
 *   Plain  transparent, sits on the page background
 *   Card   its own colour with rounded top corners (the card lip)
 *   Band   its own colour, square, full width
 *   Cover  a picture fading into the row
 *
 * A Look is DERIVED from the stored row (bg_color, surfaceRadius,
 * coverImage), never stored itself, so every existing row already has
 * one and nothing migrates. `applyLook` writes only the fields that
 * define the Look and leaves everything else alone.
 */
import type { PageRow } from "@/types/rows";

export type RowLook = "plain" | "card" | "band" | "cover";

export const ROW_LOOKS: { key: RowLook; label: string; hint: string }[] = [
  { key: "plain", label: "Plain", hint: "Sits on the page background" },
  { key: "card", label: "Card", hint: "Own colour, rounded top corners" },
  { key: "band", label: "Band", hint: "Own colour, square, full width" },
  { key: "cover", label: "Cover", hint: "A picture fading into the row" },
];

/** Default colour when a colourless row becomes a Card or Band. */
export const DEFAULT_SURFACE = "#FFFFFF";

export const deriveLook = (row: PageRow): RowLook => {
  if (row.layout?.coverImage) return "cover";
  const radius = row.layout?.surfaceRadius || "none";
  if (row.bg_color) return radius === "none" ? "band" : "card";
  return "plain";
};

/** Does this row round its top corners? (The "Rounded top" toggle.) */
export const hasRoundedTop = (row: PageRow): boolean => (row.layout?.surfaceRadius || "none") !== "none";

/**
 * The patch that turns `row` into `look`. Returns row-level fields
 * (`bg_color`) and a `layout` patch to spread over the existing layout.
 */
export const applyLook = (row: PageRow, look: RowLook): { bg_color?: string; layout: Record<string, unknown> } => {
  const layout: Record<string, unknown> = {};
  const leavingCover = deriveLook(row) === "cover" && look !== "cover";
  if (leavingCover) { layout.coverImage = ""; layout.coverImageAlt = ""; }
  switch (look) {
    case "plain":
      return { bg_color: "", layout: { ...layout, surfaceRadius: "none" } };
    case "card":
      return { bg_color: row.bg_color || DEFAULT_SURFACE, layout: { ...layout, surfaceRadius: hasRoundedTop(row) ? row.layout?.surfaceRadius : "medium" } };
    case "band":
      return { bg_color: row.bg_color || DEFAULT_SURFACE, layout: { ...layout, surfaceRadius: "none" } };
    case "cover":
      /* The picture itself is chosen in the Cover picture group, which
         the tab opens for this Look. Keep whatever colour was there. */
      return { layout: { ...layout, coverMode: row.layout?.coverMode || "fade" } };
  }
};
