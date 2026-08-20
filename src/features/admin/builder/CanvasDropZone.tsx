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

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
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
  /** When true the zone "lights up" because something is being dragged. */
  active?: boolean;
}

const CanvasDropZone = ({ position }: CanvasDropZoneProps) => {
  const { enabled } = useBuilder();
  const id = buildDropZoneId(position);
  const { setNodeRef, isOver, active } = useDroppable({ id });
  // US — idle discoverability: first-time editors have no way to know a
  // drop zone exists here until they're already mid-drag. Track hover
  // even at rest so we can surface a subtle "+" hint.
  const [hovered, setHovered] = useState(false);

  // PUBLIC-SITE FAST PATH — render nothing.
  if (!enabled) return null;

  // We only want the zone to visually OCCUPY LAYOUT SPACE while a drag
  // is in progress; otherwise it would steal vertical rhythm from the
  // design (height stays 0 at rest, same as before this change).
  const dragging = !!active;

  return (
    <div
      ref={setNodeRef}
      data-canvas-drop-zone={id}
      aria-hidden
      className="relative"
      style={{
        height: dragging ? (position.kind === "end" ? 64 : 24) : 0,
        // Smooth height transition so zones don't jump in/out abruptly
        // when a drag starts.
        transition: "height 120ms ease, background-color 120ms ease",
        margin: dragging ? "4px 0" : 0,
        borderRadius: 6,
        // Visual states:
        //   • idle, not hovered     → completely invisible
        //   • idle, hovered         → subtle "+" hint (discoverability)
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
    >
      {!dragging && (
        // Absolutely positioned so the hover hit-area (and the "+" hint
        // it reveals) never adds to the zone's own layout height — the
        // zone stays 0px at rest, preserving normal row spacing exactly
        // as before. A small vertical straddle (±4px) is enough to be
        // discoverable without meaningfully overlapping neighbouring
        // row content.
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="absolute left-0 right-0 flex items-center justify-center"
          style={{ top: -4, height: 8 }}
        >
          {hovered && (
            <span
              className="flex items-center justify-center rounded-full"
              style={{
                width: 16,
                height: 16,
                backgroundColor: "hsl(var(--accent) / 0.15)",
                border: "1px dashed hsl(var(--accent) / 0.6)",
              }}
            >
              <Plus size={10} strokeWidth={2.5} style={{ color: "hsl(var(--accent))" }} />
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default CanvasDropZone;
