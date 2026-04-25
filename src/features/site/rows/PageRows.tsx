import { useSiteContentWithStatus } from "@/hooks/useSiteContent";
import {
  DEFAULT_ROW_LAYOUT,
  type PageRow,
  type PageRowV2,
  type PageRowV3,
  type PageCell,
  isPageRowV2,
  isPageRowV3,
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

type RenderableRow = PageRow | PageRowV2 | PageRowV3;

/* US 2.1 — Legacy hero bridge removed.
 * The hero is now an ordinary `type: "hero"` widget that lives at
 * `page_rows[0]` after the one-time data migration. The injection
 * helpers (`buildHomepageHeroRow`, `hasHeroContent`,
 * `rowContainsHeroWidget`) and the `heroContent` prop pipeline are
 * gone — the unified canvas is the single source of truth. */


/** Read the first widget type in a v2/v3 row, walking cells when needed. */
const firstWidgetTypeInLayoutRow = (row: PageRowV2 | PageRowV3): string | undefined => {
  const col0: any = row.columns?.[0];
  if (!col0) return undefined;
  if (Array.isArray(col0.cells) && col0.cells.length > 0) {
    const cell0 = col0.cells[0];
    return cell0?.widgets?.[0]?.type;
  }
  return col0.widgets?.[0]?.type;
};

export type Alignment = "left" | "right" | "center";
export type VAlign = "top" | "middle" | "bottom";

/**
 * Calculate alternating alignment per row (auto mode).
 * - Service (pillar) rows are always "left".
 * - After a group of pillar rows, resume with the opposite of the pre-pillar alignment.
 * - All other rows alternate left/right.
 */
const computeAutoAlignments = (rows: RenderableRow[]): Alignment[] => {
  const alignments: Alignment[] = [];
  let current: Alignment = "left";
  let prePillar: Alignment | null = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowType = isPageRowV2(row) ? firstWidgetTypeInLayoutRow(row) : row.type;
    const prev = i > 0 ? rows[i - 1] : null;
    const prevType = prev
      ? (isPageRowV2(prev) ? firstWidgetTypeInLayoutRow(prev) : prev.type)
      : null;
    const isPillar = rowType === "service";
    const prevWasPillar = prevType === "service";

    if (isPillar) {
      // Service rows default to "center" in auto mode
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

const resolveAlignment = (row: RenderableRow, autoAlign: Alignment): Alignment => {
  const explicit = row.layout?.alignment;
  if (explicit && explicit !== "auto") return explicit;
  return autoAlign;
};

const RowRenderer = ({
  row,
  rowIndex,
  align,
  globalMap,
  nested = false,
  parentRowId,
}: {
  row: RenderableRow;
  rowIndex: number;
  align: Alignment;
  globalMap: Map<string, GlobalWidget>;
  /**
   * `nested = true` means this RowRenderer is being used to paint a
   * single widget INSIDE a v2/v3 cell. In that case we MUST NOT add
   * the outer `["row", row.id]` SelectableWrapper, because `row.id`
   * here is a synthetic widget-id pretending to be a row-id — the
   * inspector would parse the resulting selection as `row:<widgetId>`
   * and fail with "selected element no longer exists" (Debug Story 1.1
   * regression). Instead we wrap with `["row", parentRowId, "widget",
   * widget.id]` so the path matches what `findWidgetLocation` expects.
   */
  nested?: boolean;
  parentRowId?: string;
}) => {
  const id = row.scope || slugify(row.strip_title);
  const vAlign: VAlign = row.layout?.verticalAlign || "middle";

  if (isPageRowV2(row)) {
    const widths = row.layout?.column_widths || row.columns.map(() => Math.round(100 / Math.max(row.columns.length, 1)));

    /**
     * Helper — paint the widgets inside a single cell. Each widget is
     * rendered through the existing RowRenderer (legacy v1 shape) so we
     * keep one widget pipeline for hero/text/service/contact/etc.
     */
    const renderWidgetsForCell = (cell: PageCell, _basePath: string[]) =>
      cell.widgets.map((widget) => {
        const legacyRow: PageRow = {
          id: widget.id,
          type: widget.type as PageRow["type"],
          strip_title: row.strip_title,
          bg_color: row.bg_color,
          scope: row.scope,
          layout: row.layout,
          content: widget.data || {},
        };
        return (
          <RowRenderer
            key={widget.id}
            row={legacyRow}
            rowIndex={rowIndex}
            align={align}
            globalMap={globalMap}
            nested
            parentRowId={row.id}
          />
        );
      });

    const renderedColumns = row.columns.map((column) => {
      // v3: columns own cells; v2 fallback: synthesize a single cell
      // from the column's widgets so the renderer has one code path.
      const cells: PageCell[] = Array.isArray(column.cells) && column.cells.length > 0
        ? column.cells
        : [{
            id: `${column.id}-cell`,
            layout: { direction: "vertical", verticalAlign: "top", justify: "stretch", gap: 24, paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0, minHeight: 0 },
            style: { bgColor: "", borderRadius: 0, borderColor: "", borderWidth: 0, customClass: "", customCss: "" },
            span: { col: 1, row: 1 },
            widgets: column.widgets || [],
          }];
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
  }

  const isService = row.type === "service";

  // ── Global Widget reference resolution (US 8.1) ──────────────────
  // If the cell content carries `__global_ref`, we substitute the
  // GLOBAL widget data for the local content and use the GLOBAL
  // type for rendering. Per-instance `__design` overrides survive
  // (see `buildGlobalRefContent` in src/types/rows.ts).
  //
  // WHY we resolve here (and not inside each widget):
  // The renderer is the single point that calls `renderWidget`, so
  // intercepting here means EVERY widget — present and future —
  // gains global-block support for free, no per-widget code change.
  const globalRef = readGlobalRef(row.content);
  let renderRow = row;
  let missingGlobal = false;
  if (globalRef) {
    const g = globalMap.get(globalRef);
    if (g) {
      // Preserve the row container metadata (id, strip_title, layout,
      // bg_color) but swap the content + type to the global widget's.
      // Re-attach `__design` so per-instance margin/padding still apply.
      const localDesign = (row.content as any)?.__design;
      const mergedContent = localDesign
        ? { ...g.data, __design: localDesign }
        : g.data;
      renderRow = { ...row, type: g.type as PageRow["type"], content: mergedContent };
    } else {
      missingGlobal = true;
    }
  }

  // Engine no longer hardcodes which component renders which row.
  // The WidgetRegistry resolves `row.type` → render fn at runtime, so
  // adding a new widget never requires editing this file (OCP).
  // See `src/widgets/index.tsx` for the bootstrap registrations and
  // `WIDGETS.md` (repo root) for the 4-step extension guide.
  const rendered = missingGlobal ? null : renderWidget({ row: renderRow, rowIndex, align, vAlign });
  if (rendered === null && !missingGlobal) return null;

  // Generic visual chrome (margin / padding / bg / radius) lives in a
  // wrapper instead of every widget — see WidgetWrapper.tsx and US 6.1.
  // The wrapper short-circuits to `<>{children}</>` when no overrides
  // are present, so un-customised rows render the EXACT same DOM as
  // before this story landed (zero visual regression risk).
  const design = readDesignSettings(renderRow.content);

  // ── Selection wrapping ─────────────────────────────────────────
  // When `nested = true` we're rendering a widget INSIDE a v2/v3 cell,
  // so:
  //   • The CellRenderer already provides the row/col/cell selection
  //     scope; we MUST NOT add a second `["row", row.id]` wrapper here
  //     because `row.id` is actually the WIDGET id (we built a synthetic
  //     legacyRow above). That would route clicks to `row:<widgetId>`,
  //     which the inspector tries to resolve against `pageRows` and
  //     fails — the user sees "selected element no longer exists".
  //   • The widget's selection path must use the REAL parent row id so
  //     `findWidgetLocation` can walk columns→cells→widgets and match
  //     by widget id.
  const widgetPath: NodePath = nested && parentRowId
    ? ["row", parentRowId, "widget", row.id]
    : ["row", row.id, "widget", row.id];

  const widgetWrapped = (
    <SelectableWrapper
      path={widgetPath}
      label={renderRow.type}
      variant="widget"
    >
      <WidgetWrapper design={design}>{rendered}</WidgetWrapper>
    </SelectableWrapper>
  );

  // Top-level rows still need an outer Row wrapper for the row-level
  // selection chrome (alignment, bg, padding settings live there).
  // Nested widgets skip it because their parent row already paints one.
  const wrapped = nested
    ? widgetWrapped
    : (
        <SelectableWrapper path={["row", row.id]} label={`Row · ${row.type}`} variant="row">
          {widgetWrapped}
        </SelectableWrapper>
      );

  return (
    <div id={id} style={{ scrollMarginTop: isService ? "0px" : "4rem", isolation: "isolate" }}>
      {missingGlobal ? (
        // Soft fallback for a deleted global block — keep the page
        // alive instead of rendering blank or 500-ing.
        <div className="py-8 text-center font-body text-xs text-muted-foreground">
          (Referenced global block was removed)
        </div>
      ) : (
        wrapped
      )}
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
 * RULE: this renderer is COMPLETELY IGNORANT of the admin panel. It
 * only takes `rows` and produces HTML.
 */
export const RowsRenderer = ({
  rows,
  footerSlot,
}: {
  rows: RenderableRow[];
  footerSlot?: React.ReactNode;
}) => {
  const autoAlignments = computeAutoAlignments(rows);
  const lastIndex = rows.length - 1;

  // Resolve `__global_ref` references in cell content to live data
  // from the `global_widgets` table (US 8.1).
  const { map: globalMap } = useGlobalWidgetMap();

  // Builder-only: drop zones must NOT alter the public DOM. On the
  // live site `enabled` is false → we render the original tree exactly
  // as it was before US 17.2 (no extra wrapper divs, no drop zones).
  // The previous version of this code wrapped non-last rows in an
  // extra <div> which broke scroll-snap on the homepage.
  const { enabled: builderEnabled } = useBuilder();

  return (
    <>
      {rows.map((row, index) => {
        // Per-row ErrorBoundary — see error-boundary.tsx for the full
        // 3-layer rationale. If a single row throws (bad JSON, missing
        // field, plugin crash), only THIS row collapses to a tiny
        // fallback. The rest of the page keeps reading naturally.
        const rendered = (
          <ErrorBoundary
            key={row.id}
            label={`row:${isPageRowV2(row) ? "layout" : row.type}`}
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
      {rows.length === 0 && footerSlot}
    </>
  );
};

const PageRows = ({
  footerSlot,
  heroContent,
}: {
  footerSlot?: React.ReactNode;
  heroContent?: Record<string, any>;
}) => {
  /**
   * Loading-aware read so we don't briefly render the hardcoded
   * DEFAULT_ROWS layout (a placeholder rows skeleton from
   * `src/types/rows.ts`) before the admin's real rows arrive from the
   * database. While `isLoading` is true on a cold first visit we render
   * NOTHING below the hero — far less jarring than flashing default
   * content that vanishes a moment later. Once react-query's cache is
   * warm (any previous visit in this tab session), `isLoading` is false
   * on the very first render, so navigating between routes still feels
   * instant.
   */
  // No hardcoded DEFAULT_ROWS fallback — passing an empty rows array
  // means the only thing that can ever paint is what the admin actually
  // saved. Combined with the `isLoading` guard below, no stale demo
  // content can flash on a refresh.
  const { isLoading, content: data } = useSiteContentWithStatus<{ rows: PageRow[] }>(
    "page_rows",
    { rows: [] },
  );
  const storedRows: RenderableRow[] = data.rows || [];
  const rows = heroContent && hasHeroContent(heroContent) && !storedRows.some(rowContainsHeroWidget)
    ? [buildHomepageHeroRow(heroContent), ...storedRows]
    : storedRows;

  // Cold-load guard: don't paint stale defaults. We still render the
  // footer slot so the page never feels totally empty during the brief
  // fetch window.
  if (isLoading) {
    return <>{footerSlot}</>;
  }

  return <RowsRenderer rows={rows} footerSlot={footerSlot} />;
};

export default PageRows;
