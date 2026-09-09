import { lazy, Suspense } from "react";
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
import type { PageCell, PageColumn } from "@/types/rows";
import { readCellLayout, readCellStyle, readCellSpan } from "@/lib/constants/rowDefaults";
import SelectableWrapper from "@/features/admin/builder/SelectableWrapper";
import { useBuilder } from "@/features/admin/builder/BuilderContext";
import { buildDropZoneId } from "@/features/admin/builder/CanvasDropZone";
// AddWidgetButton removed — widgets are added via drag-and-drop only.
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
      {/* A cell that already holds widgets still needs to be a drop
          target, otherwise a widget dragged from another cell (or a new
          one from the tray) could only ever land in EMPTY cells. The
          strip has zero height at rest and only opens up mid-drag. */}
      {builderEnabled && (
        <CellAppendDropZone rowId={rowId} colId={column.id} cellId={cell.id} />
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

/* Drop targets (dnd-kit) live in the admin and load only inside a builder. */
const CellDropTargets = lazy(() => import("@/features/admin/builder/CellDropTargets"));
const CellAppendDropZone = (props: { rowId: string; colId: string; cellId: string }) => (
  <Suspense fallback={null}><CellDropTargets kind="append" {...props} /></Suspense>
);
const EmptyCellPlaceholder = (props: { rowId: string; colId: string; cellId: string; onPick: (widgetType: string) => void }) => (
  <Suspense fallback={<div className="w-full" style={{ minHeight: 96 }} />}><CellDropTargets kind="empty" {...props} /></Suspense>
);

export default CellRenderer;
