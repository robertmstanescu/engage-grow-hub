/**
 * RowRenderer — paints a single v3 row (columns → cells → widgets).
 *
 * Owns the row-level grid (column widths come from `layout.column_widths`
 * or are split equally), the cell stacking direction, the section
 * anchor id used by the in-page nav, and the SelectableWrapper that
 * makes the row clickable in the admin canvas. Per-widget rendering
 * is delegated to `WidgetNode`.
 */

import type { PageCell, PageRowV3 } from "@/types/rows";
import type { GlobalWidget } from "@/hooks/useGlobalWidgets";
import SelectableWrapper from "@/features/admin/builder/SelectableWrapper";
import CellRenderer from "./CellRenderer";
import WidgetNode from "./WidgetNode";
import type { Alignment, VAlign } from "@/lib/layoutUtils";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

interface RowRendererProps {
  row: PageRowV3;
  rowIndex: number;
  align: Alignment;
  globalMap: Map<string, GlobalWidget>;
}

const RowRenderer = ({ row, rowIndex, align, globalMap }: RowRendererProps) => {
  const id = row.scope || slugify(row.strip_title);
  const vAlign: VAlign = row.layout?.verticalAlign || "middle";

  const widths =
    row.layout?.column_widths ||
    row.columns.map(() => Math.round(100 / Math.max(row.columns.length, 1)));

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

  return (
    <div
      id={id}
      data-section-row-id={row.id}
      className="scroll-mt-16 isolate"
    >
      <SelectableWrapper path={["row", row.id]} label="Row" variant="row">
        <div
          className="grid gap-8"
          style={{ gridTemplateColumns: widths.map((w) => `${w}fr`).join(" ") }}
        >
          {renderedColumns}
        </div>
      </SelectableWrapper>
    </div>
  );
};

export default RowRenderer;
