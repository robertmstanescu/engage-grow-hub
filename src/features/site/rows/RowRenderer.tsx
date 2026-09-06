/**
 * RowRenderer — paints a single v3 row (columns → cells → widgets).
 *
 * Owns the row-level grid (column widths come from `layout.column_widths`
 * or are split equally), the cell stacking direction, the section
 * anchor id used by the in-page nav, and the SelectableWrapper that
 * makes the row clickable in the admin canvas. Per-widget rendering
 * is delegated to `WidgetNode`.
 */

import type { PageCell, PageRow, PageRowV3 } from "@/types/rows";
import type { GlobalWidget } from "@/hooks/useGlobalWidgets";
import SelectableWrapper from "@/features/admin/builder/SelectableWrapper";
import CellRenderer from "./CellRenderer";
import WidgetNode from "./WidgetNode";
import RowSection from "./typography/RowSection";
import RowCoverImage from "./RowCoverImage";
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

  const renderedColumns = row.columns.map((column) => {
    // v3 invariant: every column owns at least one cell. Normalization
    // at the entry point guarantees this.
    const cells: PageCell[] = column.cells || [];
    const isHorizontal = (column.cell_direction || "vertical") === "horizontal";
    return (
      <div
        key={column.id}
        className={`min-w-0 flex gap-6 ${isHorizontal ? "flex-row" : "flex-col"}`}
      >
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
  const overlap = Math.max(
    0,
    Math.min(160, row.layout?.coverTextOverlap ?? 64),
  );

  const grid = (
    <div
      className="grid gap-8"
      style={{ gridTemplateColumns: widths.map((w) => `${w}fr`).join(" ") }}
    >
      {renderedColumns}
    </div>
  );

  const body = paintsSurface ? (
    <RowSurfaceProvider value>
      <RowSection
        row={row as unknown as PageRow}
        vAlign={vAlign}
        className=""
        grain={false}
        dataRowId={row.id}
      >
        {coverImage ? (
          <>
            <RowCoverImage
              src={coverImage}
              alt={row.layout?.coverImageAlt || ""}
              layout={row.layout}
            />
            <div
              className="relative z-10"
              style={{ marginTop: `calc(-1 * clamp(0px, ${overlap / 2}px + 2vw, ${overlap}px))` }}
            >
              {grid}
            </div>
          </>
        ) : (
          grid
        )}
      </RowSection>
    </RowSurfaceProvider>
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
