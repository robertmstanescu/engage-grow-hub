/**
 * Pure layout helpers shared by the row renderer.
 *
 * Lives in `lib/` because nothing here touches React, the DOM, or any
 * data source — these are deterministic transformations of a row tree
 * that can be unit-tested in isolation.
 */

import type { PageRowV3 } from "@/types/rows";

/** Horizontal alignment for a row's content. */
export type Alignment = "left" | "right" | "center";

/** Vertical alignment for a row's content. */
export type VAlign = "top" | "middle" | "bottom";

/** Read the first widget type in a v3 row, walking column 0 / cell 0. */
const firstWidgetTypeInLayoutRow = (row: PageRowV3): string | undefined =>
  row.columns?.[0]?.cells?.[0]?.widgets?.[0]?.type;

/**
 * Compute the alternating "auto" alignment for each row in order.
 *
 * Rules:
 *  • Service ("pillar") rows always render centered.
 *  • Non-pillar rows alternate left ↔ right.
 *  • After a contiguous run of pillar rows, alignment resumes with the
 *    OPPOSITE side of whatever was active before the pillar run, so the
 *    rhythm visibly inverts around each pillar block.
 *
 * @returns one alignment per row, in input order.
 */
export const computeAutoAlignments = (rows: PageRowV3[]): Alignment[] => {
  const alignments: Alignment[] = [];
  let current: Alignment = "left";
  let prePillar: Alignment | null = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowType = firstWidgetTypeInLayoutRow(row);
    const prev = i > 0 ? rows[i - 1] : null;
    const prevType = prev ? firstWidgetTypeInLayoutRow(prev) : null;
    const isPillar = rowType === "service";
    const prevWasPillar = prevType === "service";

    if (isPillar) {
      if (!prevWasPillar) prePillar = current;
      alignments.push("center");
    } else {
      if (prevWasPillar && prePillar !== null) {
        current = prePillar === "left" ? "right" : "left";
        prePillar = null;
      }
      alignments.push(current);
      current = current === "left" ? "right" : "left";
    }
  }
  return alignments;
};

/**
 * Resolve the effective alignment for a row: explicit `layout.alignment`
 * wins, otherwise we fall back to the alternating "auto" value.
 */
export const resolveAlignment = (row: PageRowV3, autoAlign: Alignment): Alignment => {
  const explicit = row.layout?.alignment;
  if (explicit && explicit !== "auto") return explicit;
  return autoAlign;
};
