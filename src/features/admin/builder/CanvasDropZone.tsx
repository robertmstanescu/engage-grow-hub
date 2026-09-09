/**
 * ════════════════════════════════════════════════════════════════════
 * CanvasDropZone — US 17.2
 * ════════════════════════════════════════════════════════════════════
 *
 * Thin droppable target injected between rows on the admin canvas.
 * Picks up tray-source drags (see `ElementsTray`) so a new widget can
 * be inserted at a precise index in the page.
 *
 * PUBLIC-SITE CONTRACT
 * --------------------
 * Like `SelectableWrapper`, this component is rendered by the SAME
 * `RowsRenderer` the live site uses. When the `BuilderContext` is
 * disabled (no provider above the tree → public visitor), we render
 * absolutely nothing. Zero DOM, zero perf cost.
 *
 * VISUAL BEHAVIOUR
 * ----------------
 * • Idle              → invisible 8 px gap (keeps natural row rhythm).
 * • Drag in progress  → faint dashed accent guide so editors see WHERE
 *                       a drop will land.
 * • Drag hovering     → solid accent bar (clearly the active target).
 *
 * The id contract is OWNED HERE so the parent `DndContext`'s
 * `onDragEnd` can parse the target into an insertion index — see
 * `parseDropZoneId` below.
 */

import { Suspense, lazy } from "react";
import { useBuilder } from "./BuilderContext";

/* ─── id helpers ────────────────────────────────────────────────── */

export const DROP_ZONE_PREFIX = "canvas-drop:";

/**
 * `position` describes where to insert relative to the page tree:
 *   • before <rowId>             — insert as a new row above an existing row
 *   • end                         — append a new row at the bottom
 *   • cell <rowId>:<colId>:<cellId> — append a widget INSIDE an empty cell
 *                                     (US 1.2 — LumApps-style cells)
 */
export type CanvasDropPosition =
  | { kind: "before"; rowId: string }
  | { kind: "end" }
  | { kind: "cell"; rowId: string; colId: string; cellId: string };

export const buildDropZoneId = (pos: CanvasDropPosition): string => {
  if (pos.kind === "end") return `${DROP_ZONE_PREFIX}end`;
  if (pos.kind === "before") return `${DROP_ZONE_PREFIX}before:${pos.rowId}`;
  return `${DROP_ZONE_PREFIX}cell:${pos.rowId}:${pos.colId}:${pos.cellId}`;
};

/** Inverse of `buildDropZoneId`. Returns `null` for non-canvas drops. */
export const parseDropZoneId = (id: string | number): CanvasDropPosition | null => {
  if (typeof id !== "string" || !id.startsWith(DROP_ZONE_PREFIX)) return null;
  const rest = id.slice(DROP_ZONE_PREFIX.length);
  if (rest === "end") return { kind: "end" };
  if (rest.startsWith("before:")) return { kind: "before", rowId: rest.slice("before:".length) };
  if (rest.startsWith("cell:")) {
    const [rowId, colId, cellId] = rest.slice("cell:".length).split(":");
    if (rowId && colId && cellId) return { kind: "cell", rowId, colId, cellId };
    return null;
  }
  return null;
};

/* ─── component ─────────────────────────────────────────────────── */
interface CanvasDropZoneProps {
  position: CanvasDropPosition;
  active?: boolean;
}

/* The droppable implementation (and dnd-kit with it) loads only when a
   builder is active; the public site renders nothing here. */
const CanvasDropZoneLive = lazy(() => import("./CanvasDropZoneLive"));

const CanvasDropZone = ({ position }: CanvasDropZoneProps) => {
  const { enabled } = useBuilder();
  if (!enabled) return null;
  return (
    <Suspense fallback={null}>
      <CanvasDropZoneLive position={position} />
    </Suspense>
  );
};

export default CanvasDropZone;
