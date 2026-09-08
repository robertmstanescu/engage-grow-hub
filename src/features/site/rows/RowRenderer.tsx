/**
 * RowRenderer — paints a single v3 row (columns → cells → widgets).
 *
 * Owns the row-level grid (column widths come from `layout.column_widths`
 * or are split equally), the cell stacking direction, the section
 * anchor id used by the in-page nav, and the SelectableWrapper that
 * makes the row clickable in the admin canvas. Per-widget rendering
 * is delegated to `WidgetNode`.
 */

import { useLayoutEffect, useRef, useState } from "react";
import type { PageCell, PageRow, PageRowV3, RowLayout } from "@/types/rows";
import type { GlobalWidget } from "@/hooks/useGlobalWidgets";
import SelectableWrapper from "@/features/admin/builder/SelectableWrapper";
import CellRenderer from "./CellRenderer";
import WidgetNode from "./WidgetNode";
import RowSection from "./typography/RowSection";
import RowCoverImage from "./RowCoverImage";
import SemanticAligner from "./SemanticAligner";
import { RowSurfaceProvider } from "./RowSurfaceContext";
import type { Alignment, VAlign } from "@/lib/layoutUtils";


const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

interface RowRendererProps {
  row: PageRowV3;
  rowIndex: number;
  align: Alignment;
  globalMap: Map<string, GlobalWidget>;
}

const RowRenderer = ({
  row,
  rowIndex,
  align,
  globalMap,
}: RowRendererProps) => {
  const id = row.scope || slugify(row.strip_title);
  const vAlign: VAlign = row.layout?.verticalAlign || "middle";


  // A row-level width array is only valid when it matches the number of
  // actual builder columns. Older image+text rows sometimes persisted the
  // widget's internal two-zone split here despite living in one column;
  // ignoring that mismatch keeps the host row full-width.
  const storedWidths = row.layout?.column_widths;
  const widths = Array.isArray(storedWidths) && storedWidths.length === row.columns.length
    ? storedWidths
    : row.columns.map(() => Math.round(100 / Math.max(row.columns.length, 1)));

  const renderWidgetsForCell = (cell: PageCell, _basePath: string[]) =>
    cell.widgets.map((widget) => (
      <WidgetNode
        key={widget.id}
        widget={widget}
        parentRow={row}
        rowIndex={rowIndex}
        align={align}
        vAlign={vAlign}
        globalMap={globalMap}
      />
    ));

  /* Symmetry: by default side-by-side blocks stretch to a shared height
     (tops and bottoms line up); "top" opts into a looser arrangement. */
  const blockAlign = row.layout?.blockAlign || "stretch";
  const numberBlocks = row.layout?.numberBlocks === true;

  const renderedColumns = row.columns.map((column, columnIndex) => {
    // v3 invariant: every column owns at least one cell. Normalization
    // at the entry point guarantees this.
    const cells: PageCell[] = column.cells || [];
    const isHorizontal = (column.cell_direction || "vertical") === "horizontal";
    return (
      <div
        key={column.id}
        className={`min-w-0 flex gap-6 ${isHorizontal ? "flex-row" : "flex-col"} ${blockAlign === "stretch" ? "h-full" : ""}`}
      >
        {numberBlocks && (
          <span
            className="font-body uppercase block"
            style={{
              fontSize: "var(--fs-eyebrow)",
              letterSpacing: "var(--ls-label, 0.28em)",
              color: "color-mix(in srgb, var(--row-fg, hsl(var(--muted-foreground))) 70%, transparent)",
            }}
          >
            {String(columnIndex + 1).padStart(2, "0")}
          </span>
        )}
        {cells.map((cell) => (
          <CellRenderer
            key={cell.id}
            rowId={row.id}
            column={column}
            cell={cell}
            renderWidgets={renderWidgetsForCell}
          />
        ))}
      </div>
    );
  });

  /* ── Row-level surface ──
     A row paints its colour, edge shapes, height and optional cover
     image ONCE around all of its widgets whenever it holds more than a
     single widget, or whenever it has its own cover picture. Otherwise
     the single widget keeps painting itself exactly as before. */
  const widgetCount = row.columns.reduce(
    (n, col) => n + (col.cells || []).reduce((m, cell) => m + (cell.widgets?.length || 0), 0),
    0,
  );
  const coverImage = row.layout?.coverImage?.trim() || "";
  const paintsSurface = widgetCount > 1 || Boolean(coverImage);
  /* ── How far the content climbs over the cover picture ──
   *  Preferred: a share of the picture's rendered height
   *  (`coverTextOverlapPct`), measured live because the band's height
   *  depends on the photo's ratio, the height cap and the viewport.
   *  "A third of the picture" then means a third everywhere.
   *  Legacy: a pixel value (`coverTextOverlap`), reduced on phones. */
  const overlapPct = row.layout?.coverTextOverlapPct;
  const overlap = Math.max(0, Math.min(160, row.layout?.coverTextOverlap ?? 64));
  const coverRef = useRef<HTMLDivElement>(null);
  const [coverHeight, setCoverHeight] = useState(0);
  useLayoutEffect(() => {
    const el = coverRef.current;
    if (!el || overlapPct == null) return;
    const read = () => setCoverHeight(el.getBoundingClientRect().height);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [overlapPct, coverImage]);
  const overlapMarginTop =
    overlapPct != null
      ? `-${Math.round((coverHeight * Math.max(0, Math.min(90, overlapPct))) / 100)}px`
      : `calc(-1 * clamp(0px, ${overlap / 2}px + 2vw, ${overlap}px))`;

  // `layout` is optional on the row, so index the field type via RowLayout
  // rather than PageRowV3["layout"] (which is `RowLayout | undefined`).
  const gapMap: Record<NonNullable<RowLayout["columnGap"]>, string> = {
    tight: "1rem",
    normal: "2rem",
    wide: "4rem",
  };
  const gap = gapMap[row.layout?.columnGap || "normal"];
  const grid = (
    <SemanticAligner
      columns={renderedColumns}
      widths={widths}
      gap={gap}
      alignItems={blockAlign === "stretch" ? "stretch" : "start"}
      disabled={row.columns.length < 2}
    />
  );

  /* RowSection now owns the surface radius/clipping logic, so no
     duplicate borderRadius needs to be injected here. */

  const body = paintsSurface ? (
    <RowSection
      row={row as unknown as PageRow}
      vAlign={vAlign}
      className=""
      grain={false}
      flushTop={Boolean(coverImage)}
      dataRowId={row.id}
    >
      {/* The provider sits INSIDE the section so only the widgets' own
          nested RowSections render bare — this one still paints. */}
      <RowSurfaceProvider value>
        {coverImage ? (
          <>
            {/* `w-full`: the section is a centred flex column, so an
                unsized wrapper would shrink to the picture's intrinsic
                width and the cover would no longer span the row. */}
            <div ref={coverRef} className="w-full">
              <RowCoverImage
                src={coverImage}
                alt={row.layout?.coverImageAlt || ""}
                layout={row.layout}
              />
            </div>
            <div className="relative z-10" style={{ marginTop: overlapMarginTop }}>
              {grid}
            </div>
          </>
        ) : (
          grid
        )}
      </RowSurfaceProvider>
    </RowSection>
  ) : (
    grid
  );

  return (
    <div id={id} data-section-row-id={row.id} className="scroll-mt-16">
      <SelectableWrapper path={["row", row.id]} label="Row" variant="row">
        {body}
      </SelectableWrapper>
    </div>
  );
};

export default RowRenderer;
