import { useDroppable } from "@dnd-kit/core";
import { buildDropZoneId } from "./CanvasDropZone";

/**
 * CellDropTargets — the two dnd-kit targets a cell shows inside the
 * builder: an append strip under a filled cell, and the placeholder of
 * an empty cell. Moved out of the public CellRenderer so dnd-kit never
 * ships to visitors; CellRenderer lazy-loads this file when a builder
 * is active.
 */
/* ─── append-drop strip for non-empty cells ──────────────────────── */

export const CellAppendDropZone = ({ rowId, colId, cellId }: { rowId: string; colId: string; cellId: string }) => {
  const dropId = buildDropZoneId({ kind: "cell", rowId, colId, cellId });
  const { setNodeRef, isOver, active } = useDroppable({ id: dropId });
  const dragging = !!active;

  return (
    <div
      ref={setNodeRef}
      data-canvas-drop-zone={dropId}
      aria-hidden
      style={{
        width: "100%",
        height: dragging ? 28 : 0,
        marginTop: dragging ? 4 : 0,
        borderRadius: 6,
        border: dragging
          ? isOver
            ? "2px solid hsl(var(--accent))"
            : "1px dashed hsl(var(--accent) / 0.6)"
          : "none",
        backgroundColor: isOver ? "hsl(var(--accent) / 0.12)" : "transparent",
        transition: "height 120ms ease, background-color 120ms ease",
      }}
    />
  );
};

/* ─── empty-cell placeholder ─────────────────────────────────────── */

/**
 * The "+" affordance shown for cells with no widgets. Builder-only.
 *
 * Two affordances in one component:
 *   1. CLICK   → bubbles to the surrounding SelectableWrapper which
 *                sets the activeNodePath to this cell, so the inspector
 *                opens "Cell Settings" and the editor sees the controls.
 *   2. DROP    → registers a dnd-kit droppable so a widget dragged from
 *                the ElementsTray lands directly inside the cell. The
 *                drop is parsed in `BuilderDndShell` via `parseDropZoneId`.
 *
 * `data-cell-add-target` is preserved as a hook for any future
 * widget-picker pop-over (e.g. click-to-pick instead of drag).
 */
interface EmptyCellPlaceholderProps {
  rowId: string;
  colId: string;
  cellId: string;
  /** Click-to-pick handler — opens the widget picker popover. */
  onPick: (widgetType: string) => void;
}

export const EmptyCellPlaceholder = ({ rowId, colId, cellId, onPick }: EmptyCellPlaceholderProps) => {
  const dropId = buildDropZoneId({ kind: "cell", rowId, colId, cellId });
  const { setNodeRef, isOver, active } = useDroppable({ id: dropId });
  const dragging = !!active;

  return (
    <div
      ref={setNodeRef}
      data-cell-add-target="true"
      data-canvas-drop-zone={dropId}
      className="flex items-center justify-center w-full"
      style={{
        minHeight: 96,
        border: isOver
          ? "2px solid hsl(var(--accent))"
          : dragging
            ? "1px dashed hsl(var(--accent) / 0.6)"
            : "1px dashed hsl(var(--border))",
        backgroundColor: isOver ? "hsl(var(--accent) / 0.12)" : "transparent",
        borderRadius: 6,
        color: "hsl(var(--muted-foreground))",
        fontSize: 12,
        cursor: dragging ? "copy" : "default",
        transition: "background-color 120ms ease, border-color 120ms ease",
        padding: 8,
      }}
    >
      {isOver ? (
        // While dragging from the tray, show only the drop indicator —
        // the popover trigger would compete with the drop interaction.
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md"
          style={{ backgroundColor: "hsl(var(--accent) / 0.2)" }}>
          <span className="font-body text-micro uppercase tracking-wider">
            Drop to add
          </span>
        </span>
      ) : (
        <span className="font-body text-micro uppercase tracking-wider">
          Drag a widget here
        </span>
      )}
    </div>
  );
};


type Props =
  | ({ kind: "append" } & { rowId: string; colId: string; cellId: string })
  | ({ kind: "empty" } & EmptyCellPlaceholderProps);

const CellDropTargets = (props: Props) =>
  props.kind === "append"
    ? <CellAppendDropZone rowId={props.rowId} colId={props.colId} cellId={props.cellId} />
    : <EmptyCellPlaceholder rowId={props.rowId} colId={props.colId} cellId={props.cellId} onPick={props.onPick} />;

export default CellDropTargets;
