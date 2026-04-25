import { useSiteContentWithStatus } from "@/hooks/useSiteContent";
import { type PageRow, readDesignSettings, readGlobalRef } from "@/types/rows";
import { ErrorBoundary, RowFallback } from "@/components/ui/error-boundary";
import { renderWidget } from "@/lib/WidgetRegistry";
import WidgetWrapper from "@/components/widgets/WidgetWrapper";
import { useGlobalWidgetMap, type GlobalWidget } from "@/hooks/useGlobalWidgets";
// US 15.2 — selection chrome for the admin canvas. On the public site
// the BuilderProvider is absent, so SelectableWrapper renders as a
// no-op fragment (zero DOM, zero perf cost). See SelectableWrapper.tsx.
import SelectableWrapper from "@/features/admin/builder/SelectableWrapper";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export type Alignment = "left" | "right" | "center";
export type VAlign = "top" | "middle" | "bottom";

/**
 * Calculate alternating alignment per row (auto mode).
 * - Service (pillar) rows are always "left".
 * - After a group of pillar rows, resume with the opposite of the pre-pillar alignment.
 * - All other rows alternate left/right.
 */
const computeAutoAlignments = (rows: PageRow[]): Alignment[] => {
  const alignments: Alignment[] = [];
  let current: Alignment = "left";
  let prePillar: Alignment | null = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const isPillar = row.type === "service";
    const prevWasPillar = i > 0 && rows[i - 1].type === "service";

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

const resolveAlignment = (row: PageRow, autoAlign: Alignment): Alignment => {
  const explicit = row.layout?.alignment;
  if (explicit && explicit !== "auto") return explicit;
  return autoAlign;
};

const RowRenderer = ({
  row,
  rowIndex,
  align,
  globalMap,
}: {
  row: PageRow;
  rowIndex: number;
  align: Alignment;
  globalMap: Map<string, GlobalWidget>;
}) => {
  const id = row.scope || slugify(row.strip_title);
  const isService = row.type === "service";
  const vAlign: VAlign = row.layout?.verticalAlign || "middle";

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

  return (
    <div id={id} style={{ scrollMarginTop: isService ? "0px" : "4rem", isolation: "isolate" }}>
      {missingGlobal ? (
        // Soft fallback for a deleted global block — keep the page
        // alive instead of rendering blank or 500-ing.
        <div className="py-8 text-center font-body text-xs text-muted-foreground">
          (Referenced global block was removed)
        </div>
      ) : (
        // US 15.2 — outer SelectableWrapper = the ROW; inner = the WIDGET.
        // Two distinct ids so clicking the widget selects ONLY the widget
        // (thanks to e.stopPropagation in SelectableWrapper). Clicking
        // the row's blank space (anywhere not covered by the widget)
        // selects the row instead.
        <SelectableWrapper id={`row:${row.id}`} label={`Row · ${row.type}`} variant="row">
          <SelectableWrapper id={`widget:${row.id}`} label={renderRow.type} variant="widget">
            <WidgetWrapper design={design}>{rendered}</WidgetWrapper>
          </SelectableWrapper>
        </SelectableWrapper>
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
  rows: PageRow[];
  footerSlot?: React.ReactNode;
}) => {
  const autoAlignments = computeAutoAlignments(rows);
  const lastIndex = rows.length - 1;

  // Resolve `__global_ref` references in cell content to live data
  // from the `global_widgets` table (US 8.1).
  const { map: globalMap } = useGlobalWidgetMap();

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
            label={`row:${row.type}`}
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
        // Group the last row with the footer in one snap section
        if (index === lastIndex && footerSlot) {
          return (
            <div key={row.id} className="snap-section">
              {rendered}
              {footerSlot}
            </div>
          );
        }
        return rendered;
      })}
      {/* Fallback if no rows */}
      {rows.length === 0 && footerSlot}
    </>
  );
};

const PageRows = ({ footerSlot }: { footerSlot?: React.ReactNode }) => {
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
