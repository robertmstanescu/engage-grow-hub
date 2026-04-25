import { useMemo } from "react";
import { useSiteContentWithStatus } from "@/hooks/useSiteContent";
import {
  type PageRow,
  type PageRowV3,
  type PageCell,
  type PageWidget,
  normalizeRowsToV3,
  readDesignSettings,
  readGlobalRef,
} from "@/types/rows";
import { ErrorBoundary, RowFallback } from "@/components/ui/error-boundary";
import { renderWidget } from "@/lib/WidgetRegistry";
import WidgetWrapper from "@/components/widgets/WidgetWrapper";
import { useGlobalWidgetMap, type GlobalWidget } from "@/hooks/useGlobalWidgets";
import SelectableWrapper from "@/features/admin/builder/SelectableWrapper";
import CanvasDropZone from "@/features/admin/builder/CanvasDropZone";
import { useBuilder, type NodePath } from "@/features/admin/builder/BuilderContext";
import CellRenderer from "./CellRenderer";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/* ════════════════════════════════════════════════════════════════════
 * RENDERING ENGINE — V3 ATOMIC NODE TREE ONLY
 * ════════════════════════════════════════════════════════════════════
 *
 * US 2.1 — Legacy hero bridge removed. The hero is an ordinary
 *          `type: "hero"` widget at `page_rows[0]`.
 *
 * US 2.2 — V1/V2 rendering branches removed. Every row entering this
 *          renderer is guaranteed to be a `PageRowV3` (rows → columns →
 *          cells → widgets) thanks to `normalizeRowsToV3()` applied at
 *          the `RowsRenderer` entry point. The renderer therefore
 *          assumes 100% Atomic Node Tree compliance — no `if (isLegacy)`
 *          forks, no `column.widgets` fallbacks, no synthetic v2 cells.
 *          If a v1/v2 payload is ever passed in, it is upgraded once at
 *          the boundary and the rest of the pipeline never sees it.
 * ──────────────────────────────────────────────────────────────────── */


/** Read the first widget type in a v3 row, walking cells. */
const firstWidgetTypeInLayoutRow = (row: PageRowV3): string | undefined => {
  const col0 = row.columns?.[0];
  if (!col0) return undefined;
  const cell0 = col0.cells?.[0];
  return cell0?.widgets?.[0]?.type;
};

export type Alignment = "left" | "right" | "center";
export type VAlign = "top" | "middle" | "bottom";

/**
 * Calculate alternating alignment per row (auto mode).
 * - Service (pillar) rows are always "left".
 * - After a group of pillar rows, resume with the opposite of the pre-pillar alignment.
 * - All other rows alternate left/right.
 */
const computeAutoAlignments = (rows: PageRowV3[]): Alignment[] => {
  const alignments: Alignment[] = [];
  let current: Alignment = "left";
  let prePillar: Alignment | null = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowType = firstWidgetTypeInLayoutRow(row);
    const prev = i > 0 ? rows[i - 1] : null;
    const prevType = prev ? firstWidgetTypeInLayoutRow(prev) : null;
    const isPillar = rowType === "service";
    const prevWasPillar = prevType === "service";

    if (isPillar) {
      if (!prevWasPillar) prePillar = current;
      alignments.push("center");
    } else {
      if (prevWasPillar && prePillar !== null) {
        current = prePillar === "left" ? "right" : "left";
        prePillar = null;
      }
      alignments.push(current);
      current = current === "left" ? "right" : "left";
    }
  }
  return alignments;
};

const resolveAlignment = (row: PageRowV3, autoAlign: Alignment): Alignment => {
  const explicit = row.layout?.alignment;
  if (explicit && explicit !== "auto") return explicit;
  return autoAlign;
};

/* ──────────────────────────────────────────────────────────────────
 * WidgetNode — render a SINGLE PageWidget inside a v3 cell.
 *
 * Builds an internal `PageRow`-shaped view of the widget so the
 * existing `renderWidget()` registry (which expects `{ row, rowIndex,
 * align, vAlign }`) can paint it without per-widget code changes. This
 * is a render-target adapter, NOT a legacy fallback — the v3 renderer
 * always walks rows → columns → cells → widgets and dispatches each
 * widget through this adapter exactly once.
 * ──────────────────────────────────────────────────────────────────── */
const WidgetNode = ({
  widget,
  parentRow,
  rowIndex,
  align,
  vAlign,
  globalMap,
}: {
  widget: PageWidget;
  parentRow: PageRowV3;
  rowIndex: number;
  align: Alignment;
  vAlign: VAlign;
  globalMap: Map<string, GlobalWidget>;
}) => {
  const adapterRow: PageRow = {
    id: widget.id,
    type: widget.type as PageRow["type"],
    strip_title: parentRow.strip_title,
    bg_color: parentRow.bg_color,
    scope: parentRow.scope,
    layout: parentRow.layout,
    content: widget.data || {},
  };

  // ── Global Widget reference resolution (US 8.1) ──────────────────
  const globalRef = readGlobalRef(adapterRow.content);
  let renderRow = adapterRow;
  let missingGlobal = false;
  if (globalRef) {
    const g = globalMap.get(globalRef);
    if (g) {
      const localDesign = (adapterRow.content as any)?.__design;
      const mergedContent = localDesign
        ? { ...g.data, __design: localDesign }
        : g.data;
      renderRow = { ...adapterRow, type: g.type as PageRow["type"], content: mergedContent };
    } else {
      missingGlobal = true;
    }
  }

  if (missingGlobal) {
    return (
      <div className="py-8 text-center font-body text-xs text-muted-foreground">
        (Referenced global block was removed)
      </div>
    );
  }

  const rendered = renderWidget({ row: renderRow, rowIndex, align, vAlign });
  if (rendered === null) return null;

  const design = readDesignSettings(renderRow.content);
  const widgetPath: NodePath = ["row", parentRow.id, "widget", widget.id];

  return (
    <SelectableWrapper path={widgetPath} label={renderRow.type} variant="widget">
      <WidgetWrapper design={design}>{rendered}</WidgetWrapper>
    </SelectableWrapper>
  );
};

const RowRenderer = ({
  row,
  rowIndex,
  align,
  globalMap,
}: {
  row: PageRowV3;
  rowIndex: number;
  align: Alignment;
  globalMap: Map<string, GlobalWidget>;
}) => {
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
    // at the entry point guarantees this — no fallback synthesis here.
    const cells: PageCell[] = column.cells || [];
    const cellDirection = column.cell_direction || "vertical";
    return (
      <div
        key={column.id}
        className="min-w-0"
        style={{
          display: "flex",
          flexDirection: cellDirection === "vertical" ? "column" : "row",
          gap: 24,
        }}
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
    <div id={id} style={{ scrollMarginTop: "4rem", isolation: "isolate" }}>
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

/**
 * RowsRenderer — PURE renderer that paints an array of rows.
 *
 * WHY this exists (US 15.1):
 * The admin canvas needs to render the LIVE site's row tree against the
 * in-memory draft state — not the published DB content. By splitting
 * the data fetch (PageRows) from the actual rendering (RowsRenderer),
 * the admin can pass `rows={draftRows}` and see WYSIWYG edits update on
 * every keystroke, while the public site continues to use <PageRows />
 * unchanged. Same widget tree, same DOM, same animations.
 *
 * US 2.2 — This is the SINGLE chokepoint where rows are normalized to
 * v3. Every downstream renderer (RowRenderer, CellRenderer, WidgetNode)
 * relies on the v3 invariant. Callers may pass v1/v2/v3 freely; the
 * renderer upgrades once and never branches on schema again.
 */
export const RowsRenderer = ({
  rows,
  footerSlot,
}: {
  rows: Array<PageRow | PageRowV3 | any>;
  footerSlot?: React.ReactNode;
}) => {
  // US 2.2 — Normalize at the boundary. Memoized on `rows` identity so
  // we don't re-walk the tree on every parent re-render. Idempotent for
  // already-v3 input (the migrator no-ops).
  const v3Rows = useMemo(() => normalizeRowsToV3(rows), [rows]);

  const autoAlignments = computeAutoAlignments(v3Rows);
  const lastIndex = v3Rows.length - 1;

  // Resolve `__global_ref` references in cell content to live data
  // from the `global_widgets` table (US 8.1).
  const { map: globalMap } = useGlobalWidgetMap();

  // Builder-only: drop zones must NOT alter the public DOM. On the
  // live site `enabled` is false → we render the original tree exactly
  // as it was before US 17.2 (no extra wrapper divs, no drop zones).
  const { enabled: builderEnabled } = useBuilder();

  return (
    <>
      {v3Rows.map((row, index) => {
        // Per-row ErrorBoundary — see error-boundary.tsx for the full
        // 3-layer rationale. If a single row throws (bad JSON, missing
        // field, plugin crash), only THIS row collapses to a tiny
        // fallback. The rest of the page keeps reading naturally.
        const rendered = (
          <ErrorBoundary
            key={row.id}
            label="row:layout"
            fallback={(error, reset) => <RowFallback error={error} reset={reset} />}
          >
            <RowRenderer
              row={row}
              rowIndex={index}
              align={resolveAlignment(row, autoAlignments[index])}
              globalMap={globalMap}
            />
          </ErrorBoundary>
        );
        // Group the last row with the footer in one snap section.
        if (index === lastIndex && footerSlot) {
          return (
            <div key={row.id} className="snap-section">
              {builderEnabled && (
                <CanvasDropZone position={{ kind: "before", rowId: row.id }} />
              )}
              {rendered}
              {footerSlot}
            </div>
          );
        }
        // Public site: render the row directly (no wrapper), preserving
        // the original DOM and scroll-snap behaviour.
        if (!builderEnabled) return rendered;
        // Admin canvas: wrap with a drop zone above each row.
        return (
          <div key={row.id}>
            <CanvasDropZone position={{ kind: "before", rowId: row.id }} />
            {rendered}
          </div>
        );
      })}
      {/* End-of-page drop zone — admin only. */}
      {builderEnabled && <CanvasDropZone position={{ kind: "end" }} />}
      {/* Fallback if no rows */}
      {v3Rows.length === 0 && footerSlot}
    </>
  );
};

const PageRows = ({
  footerSlot,
}: {
  footerSlot?: React.ReactNode;
}) => {
  // No hardcoded DEFAULT_ROWS fallback — passing an empty rows array
  // means the only thing that can ever paint is what the admin actually
  // saved. Combined with the `isLoading` guard below, no stale demo
  // content can flash on a refresh.
  const { isLoading, content: data } = useSiteContentWithStatus<{ rows: PageRow[] }>(
    "page_rows",
    { rows: [] },
  );
  const rows = data.rows || [];

  // Cold-load guard: don't paint stale defaults. We still render the
  // footer slot so the page never feels totally empty during the brief
  // fetch window.
  if (isLoading) {
    return <>{footerSlot}</>;
  }

  return <RowsRenderer rows={rows} footerSlot={footerSlot} />;
};

export default PageRows;
