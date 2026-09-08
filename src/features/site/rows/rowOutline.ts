import type { RowLayout } from "@/types/rows";

/**
 * A row carries the ink outline when any of its edges is "set": a
 * rounded lip or other edge shape, or a Corners size on its surface.
 * RowSection draws the outline; RowCoverImage uses the same answer to
 * shrink its own corner radius by the outline width so the picture's
 * curve sits concentric inside the border instead of leaving a sliver.
 */
export const isRowOutlined = (layout?: RowLayout): boolean => {
  if (!layout) return false;
  const shaped = (s?: { kind?: string }) => Boolean(s && s.kind && s.kind !== "none");
  return shaped(layout.shapeTop) || shaped(layout.shapeBottom) ||
    Boolean(layout.surfaceRadius && layout.surfaceRadius !== "none");
};
