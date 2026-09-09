import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { buildDropZoneId, type CanvasDropPosition } from "./CanvasDropZone";

/* ─── component ─────────────────────────────────────────────────── */

const CanvasDropZoneLive = ({ position }: { position: CanvasDropPosition }) => {
  const id = buildDropZoneId(position);
  const { setNodeRef, isOver, active } = useDroppable({ id });
  // US — idle discoverability: first-time editors have no way to know a
  // drop zone exists here until they're already mid-drag. Track hover
  // even at rest so we can surface a subtle "+" hint.
  const [hovered, setHovered] = useState(false);

  // PUBLIC-SITE FAST PATH — render nothing.

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
              className="flex items-center justify-center rounded-md"
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

export default CanvasDropZoneLive;
