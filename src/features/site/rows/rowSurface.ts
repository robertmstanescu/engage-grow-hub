/**
 * rowSurface — resolve the *effective* surface colour of a row.
 *
 * Section shapes (wave / arch / angled …) are filled with the colour of
 * the NEIGHBOURING row so the row above appears to bleed down into this
 * one (and the row below to bleed up). To do that we need one shared
 * definition of "what colour is this row painted with".
 *
 * Mesh rows are transparent, so they resolve to a soft mesh tint token
 * that reads as a continuation of the page gradient.
 */
import type { PageRow } from "@/types/rows";
import { getRowBgColor } from "./rowBackground";

/** Fill used when the neighbouring row is on the transparent mesh band. */
export const MESH_SHAPE_FILL = "hsl(var(--mesh-shape-fill))";

export const resolveRowSurface = (row?: PageRow | null): string => {
  if (!row) return MESH_SHAPE_FILL;
  const band = (row.layout as { bandTone?: string } | undefined)?.bandTone || "mesh";
  if (band === "deep") return "hsl(var(--band-deep))";
  if (band === "tint") return "hsl(var(--band-tint))";
  if (band === "white" || band === "auto") return "hsl(var(--band-white))";
  return getRowBgColor(row) || MESH_SHAPE_FILL;
};
