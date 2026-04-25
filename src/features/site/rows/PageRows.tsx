import { useSiteContentWithStatus } from "@/hooks/useSiteContent";
import { type PageRow, readDesignSettings } from "@/types/rows";
import { ErrorBoundary, RowFallback } from "@/components/ui/error-boundary";
import { renderWidget } from "@/lib/WidgetRegistry";
import WidgetWrapper from "@/components/widgets/WidgetWrapper";

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

const RowRenderer = ({ row, rowIndex, align }: { row: PageRow; rowIndex: number; align: Alignment }) => {
  const id = row.scope || slugify(row.strip_title);
  const isService = row.type === "service";
  const vAlign: VAlign = row.layout?.verticalAlign || "middle";

  // Engine no longer hardcodes which component renders which row.
  // The WidgetRegistry resolves `row.type` → render fn at runtime, so
  // adding a new widget never requires editing this file (OCP).
  // See `src/widgets/index.tsx` for the bootstrap registrations and
  // `WIDGETS.md` (repo root) for the 4-step extension guide.
  const rendered = renderWidget({ row, rowIndex, align, vAlign });
  if (rendered === null) return null;

  return (
    <div id={id} style={{ scrollMarginTop: isService ? "0px" : "4rem", isolation: "isolate" }}>
      {rendered}
    </div>
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
  const autoAlignments = computeAutoAlignments(rows);
  const lastIndex = rows.length - 1;

  // Cold-load guard: don't paint stale defaults. We still render the
  // footer slot so the page never feels totally empty during the brief
  // fetch window.
  if (isLoading) {
    return <>{footerSlot}</>;
  }

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
            <RowRenderer row={row} rowIndex={index} align={resolveAlignment(row, autoAlignments[index])} />
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

export default PageRows;
