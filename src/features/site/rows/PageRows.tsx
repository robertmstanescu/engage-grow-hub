import { useMemo } from "react";
import { useSiteContentWithStatus } from "@/hooks/useSiteContent";
import type { PageRow, PageRowV3 } from "@/types/rows";
import { normalizeRowsToV3 } from "@/lib/migrations/rowMigrations";
import { ErrorBoundary, RowFallback } from "@/components/ui/error-boundary";
import { useGlobalWidgetMap } from "@/hooks/useGlobalWidgets";
import CanvasDropZone from "@/features/admin/builder/CanvasDropZone";
import { useBuilder } from "@/features/admin/builder/BuilderContext";
import { computeAutoAlignments, resolveAlignment } from "@/lib/layoutUtils";
import RowRenderer from "./RowRenderer";

// Re-export so existing widget renderers (BoxedRow, ServiceRow, …) can
// keep importing alignment types from this module.
export type { Alignment, VAlign } from "@/lib/layoutUtils";

/**
 * Pure renderer that paints an array of rows. The caller decides where
 * the rows come from (DB content, admin draft, preview snapshot, …).
 *
 * This is the SINGLE chokepoint where rows are normalized to v3, so
 * every downstream renderer can rely on the v3 invariant. Callers may
 * pass v1, v2 or v3 rows freely; the renderer upgrades once at the
 * boundary and never branches on schema again.
 */
export const RowsRenderer = ({
  rows,
  footerSlot,
}: {
  rows: Array<PageRow | PageRowV3 | any>;
  footerSlot?: React.ReactNode;
}) => {
  // Memoize on `rows` identity so we don't re-walk the tree on every
  // parent re-render. Idempotent for already-v3 input.
  const v3Rows = useMemo(() => normalizeRowsToV3(rows), [rows]);
  const autoAlignments = computeAutoAlignments(v3Rows);
  const lastIndex = v3Rows.length - 1;

  // `__global_ref` resolution map (sourced from the global_widgets table).
  const { map: globalMap } = useGlobalWidgetMap();

  // Drop zones must NOT alter the public DOM. On the live site the
  // builder context reports `enabled: false` and we render the original
  // tree exactly as before — no extra wrappers, no drop targets.
  const { enabled: builderEnabled } = useBuilder();

  return (
    <>
      {v3Rows.map((row, index) => {
        // Per-row ErrorBoundary: a bad row collapses to a fallback;
        // the rest of the page keeps rendering naturally.
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
        // Public site: render the row directly (preserves scroll-snap).
        if (!builderEnabled) return rendered;
        // Admin canvas: wrap with a drop zone above each row.
        return (
          <div key={row.id}>
            <CanvasDropZone position={{ kind: "before", rowId: row.id }} />
            {rendered}
          </div>
        );
      })}
      {builderEnabled && <CanvasDropZone position={{ kind: "end" }} />}
      {v3Rows.length === 0 && footerSlot}
    </>
  );
};

const PageRows = ({ footerSlot }: { footerSlot?: React.ReactNode }) => {
  // No hardcoded fallback content: an empty rows array means only what
  // the admin actually saved can paint. The `isLoading` guard prevents
  // stale demo content from flashing on a refresh.
  const { isLoading, content: data } = useSiteContentWithStatus<{ rows: PageRow[] }>(
    "page_rows",
    { rows: [] },
  );
  const rows = data.rows || [];

  if (isLoading) return <>{footerSlot}</>;
  return <RowsRenderer rows={rows} footerSlot={footerSlot} />;
};

export default PageRows;
