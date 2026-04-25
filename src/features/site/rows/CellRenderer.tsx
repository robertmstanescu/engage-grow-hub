/**
 * ════════════════════════════════════════════════════════════════════
 * CellRenderer — User Story 1.2 ("LumApps-style Cell Management")
 * ════════════════════════════════════════════════════════════════════
 *
 * Renders one PageCell:
 *   • applies its layout (direction / vAlign / justify / gap / padding)
 *   • applies its style (background / border / radius / minHeight)
 *   • injects the cell's scoped custom CSS (`&` → `.cell-scope-<id>`)
 *   • wraps everything in a SelectableWrapper so editors can click the
 *     cell BACKGROUND to open Cell Settings in the Inspector
 *   • renders an "+" placeholder when the cell has no widgets so editors
 *     have an obvious drop target / quick-add affordance
 *
 * The component is rendered by `PageRows.tsx` for every cell of every
 * column of every v3 row. On the PUBLIC site the SelectableWrapper is a
 * passthrough fragment, so the rendered DOM is just:
 *
 *   <div class="cell-scope-xyz" style="...">
 *     ...widgets...
 *   </div>
 *
 * Empty cells render NOTHING on the public site (the "+" affordance is
 * builder-only) so site visitors never see hint chrome.
 */

import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { PageCell, PageColumn } from "@/types/rows";
import { readCellLayout, readCellStyle, readCellSpan } from "@/lib/constants/rowDefaults";
import SelectableWrapper from "@/features/admin/builder/SelectableWrapper";
import { useBuilder } from "@/features/admin/builder/BuilderContext";
import { buildDropZoneId } from "@/features/admin/builder/CanvasDropZone";
import AddWidgetButton from "@/features/admin/builder/AddWidgetButton";
import { parseSpacing } from "@/lib/spacing";

/* ─── style helpers ──────────────────────────────────────────────── */

const directionToFlex = (dir: "vertical" | "horizontal"): React.CSSProperties => ({
  display: "flex",
  flexDirection: dir === "vertical" ? "column" : "row",
});

const vAlignToFlex = (
  v: "top" | "middle" | "bottom" | "stretch",
  dir: "vertical" | "horizontal",
): React.CSSProperties => {
  // Cross-axis = `align-items` for both directions, since we use flex.
  // For vertical stacks, cross-axis is HORIZONTAL — so vAlign maps to
  // align-items only when direction is horizontal. To keep the editor
  // contract simple ("vertical alignment of widgets inside the cell")
  // we always interpret `vAlign` as the cell's CONTENT y-axis position.
  if (dir === "horizontal") {
    return {
      alignItems:
        v === "top" ? "flex-start" :
        v === "middle" ? "center" :
        v === "bottom" ? "flex-end" :
        "stretch",
    };
  }
  // Vertical stack → vAlign maps to justify-content (main axis = Y).
  return {
    justifyContent:
      v === "top" ? "flex-start" :
      v === "middle" ? "center" :
      v === "bottom" ? "flex-end" :
      "space-between",
  };
};

const hAlignToFlex = (
  h: "left" | "center" | "right" | "stretch",
  dir: "vertical" | "horizontal",
): React.CSSProperties => {
  if (dir === "horizontal") {
    // Horizontal main axis: justify-content drives x position.
    return {
      justifyContent:
        h === "left" ? "flex-start" :
        h === "center" ? "center" :
        h === "right" ? "flex-end" :
        "space-between",
    };
  }
  // Vertical stack: cross axis = X.
  return {
    alignItems:
      h === "left" ? "flex-start" :
      h === "center" ? "center" :
      h === "right" ? "flex-end" :
      "stretch",
  };
};

const cellScopeCss = (raw: string, scope: string) =>
  raw.replace(/<(?:\/)?script[^>]*>/gi, "").replace(/&/g, `.${scope}`);

/* ─── component ──────────────────────────────────────────────────── */

interface CellRendererProps {
  rowId: string;
  column: PageColumn;
  cell: PageCell;
  /** Render-children callback that paints the cell's widgets. */
  renderWidgets: (cell: PageCell, basePath: string[]) => ReactNode;
}

const CellRenderer = ({ rowId, column, cell, renderWidgets }: CellRendererProps) => {
  const layout = readCellLayout(cell);
  const style = readCellStyle(cell);
  const span = readCellSpan(cell);
  const { enabled: builderEnabled, addWidgetToCell, setActiveElement } = useBuilder();

  const path = ["row", rowId, "col", column.id, "cell", cell.id];
  const widgetBasePath = [...path]; // widget paths extend this base

  const scopeClass = `cell-scope-${cell.id.replace(/[^a-z0-9]/gi, "")}`;
  const scopedCss = style.customCss ? cellScopeCss(style.customCss, scopeClass) : "";

  const cellStyle: React.CSSProperties = {
    ...directionToFlex(layout.direction),
    ...vAlignToFlex(layout.verticalAlign, layout.direction),
    ...hAlignToFlex(layout.justify, layout.direction),
    // US 2.4 — force every user-defined spacing through `parseSpacing`
    // so the rendered DOM carries explicit `<n>px` strings.
    gap: parseSpacing(layout.gap),
    paddingTop: parseSpacing(layout.paddingTop),
    paddingRight: parseSpacing(layout.paddingRight),
    paddingBottom: parseSpacing(layout.paddingBottom),
    paddingLeft: parseSpacing(layout.paddingLeft),
    minHeight: parseSpacing(layout.minHeight),
    backgroundColor: style.bgColor || undefined,
    borderRadius: parseSpacing(style.borderRadius),
    border: style.borderWidth > 0 && style.borderColor
      ? `${style.borderWidth}px solid ${style.borderColor}`
      : undefined,
    gridColumn: span.col > 1 ? `span ${span.col}` : undefined,
    gridRow: span.row > 1 ? `span ${span.row}` : undefined,
    width: "100%",
  };

  const isEmpty = !cell.widgets || cell.widgets.length === 0;

  // Builder click-to-add: insert a widget into THIS cell at end and
  // immediately select it so the inspector opens.
  const handlePickAtEnd = (widgetType: string) => {
    const newId = addWidgetToCell(
      { rowId, colId: column.id, cellId: cell.id },
      widgetType,
    );
    if (newId) setActiveElement(`widget:${newId}`);
  };

  // Public site: skip selection chrome AND skip the empty placeholder
  // (visitors should never see "drop a widget here" hints). Empty cells
  // collapse to a zero-height div so the column grid stays intact.
  const inner = isEmpty ? (
    builderEnabled ? (
      <EmptyCellPlaceholder
        rowId={rowId}
        colId={column.id}
        cellId={cell.id}
        onPick={handlePickAtEnd}
      />
    ) : null
  ) : (
    <>
      {renderWidgets(cell, widgetBasePath)}
      {builderEnabled && (
        <div className="w-full" style={{ marginTop: 8 }}>
          <AddWidgetButton onPick={handlePickAtEnd} variant="inline" />
        </div>
      )}
    </>
  );

  return (
    <SelectableWrapper path={path} label="Cell" variant="widget">
      <div
        className={[
          scopeClass,
          style.customClass || "",
        ].filter(Boolean).join(" ")}
        style={cellStyle}
        data-cell-id={cell.id}
      >
        {scopedCss && (
          <style dangerouslySetInnerHTML={{ __html: scopedCss }} />
        )}
        {inner}
      </div>
    </SelectableWrapper>
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
}

const EmptyCellPlaceholder = ({ rowId, colId, cellId }: EmptyCellPlaceholderProps) => {
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
        cursor: dragging ? "copy" : "pointer",
        transition: "background-color 120ms ease, border-color 120ms ease",
      }}
    >
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{ backgroundColor: "hsl(var(--muted) / 0.6)" }}>
        <span style={{
          display: "inline-block", width: 16, height: 16, borderRadius: 999,
          backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))",
          textAlign: "center", lineHeight: "16px", fontWeight: 700,
        }}>+</span>
        <span className="font-body text-[11px] uppercase tracking-wider">
          {isOver ? "Drop to add" : "Add widget"}
        </span>
      </span>
    </div>
  );
};

export default CellRenderer;
