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

import { useDroppable } from "@dnd-kit/core";
import { useBuilder } from "./BuilderContext";

/* ─── id helpers ────────────────────────────────────────────────── */

export const DROP_ZONE_PREFIX = "canvas-drop:";

/**
 * `position` describes where to insert relative to the page. We only
 * use "before-<rowId>" and "end" for now — that's enough to express
 * any insertion point in a flat row list (insert before any row, or
 * append at the bottom).
 */
export type CanvasDropPosition =
  | { kind: "before"; rowId: string }
  | { kind: "end" };

export const buildDropZoneId = (pos: CanvasDropPosition): string =>
  pos.kind === "end"
    ? `${DROP_ZONE_PREFIX}end`
    : `${DROP_ZONE_PREFIX}before:${pos.rowId}`;

/** Inverse of `buildDropZoneId`. Returns `null` for non-canvas drops. */
export const parseDropZoneId = (id: string | number): CanvasDropPosition | null => {
  if (typeof id !== "string" || !id.startsWith(DROP_ZONE_PREFIX)) return null;
  const rest = id.slice(DROP_ZONE_PREFIX.length);
  if (rest === "end") return { kind: "end" };
  if (rest.startsWith("before:")) return { kind: "before", rowId: rest.slice("before:".length) };
  return null;
};

/* ─── component ─────────────────────────────────────────────────── */

interface CanvasDropZoneProps {
  position: CanvasDropPosition;
  /** When true the zone "lights up" because something is being dragged. */
  active?: boolean;
}

const CanvasDropZone = ({ position }: CanvasDropZoneProps) => {
  const { enabled } = useBuilder();
  const id = buildDropZoneId(position);
  const { setNodeRef, isOver, active } = useDroppable({ id });

  // PUBLIC-SITE FAST PATH — render nothing.
  if (!enabled) return null;

  // We only want the zone to "exist" visually while a drag is in
  // progress; otherwise it would steal vertical rhythm from the design.
  const dragging = !!active;

  return (
    <div
      ref={setNodeRef}
      data-canvas-drop-zone={id}
      aria-hidden
      style={{
        height: dragging ? (position.kind === "end" ? 64 : 24) : 0,
        // Smooth height transition so zones don't jump in/out abruptly
        // when a drag starts.
        transition: "height 120ms ease, background-color 120ms ease",
        margin: dragging ? "4px 0" : 0,
        borderRadius: 6,
        // Visual states:
        //   • not dragging          → completely invisible
        //   • dragging, not hovered → faint dashed guide
        //   • dragging + hovered    → solid accent bar
        backgroundColor: isOver ? "hsl(var(--accent) / 0.2)" : "transparent",
        outline: isOver
          ? "2px solid hsl(var(--accent))"
          : dragging
            ? "1px dashed hsl(var(--accent) / 0.5)"
            : "none",
        outlineOffset: -1,
      }}
    />
  );
};

export default CanvasDropZone;
