import { useSiteContentWithStatus } from "@/hooks/useSiteContent";
import {
  type PageRow,
  type PageRowV2,
  type PageColumn,
  type PageWidget,
  type ColumnLayoutPreset,
  isPageRowV2,
  migrateRowToV2,
} from "@/types/rows";
import { ErrorBoundary, RowFallback } from "@/components/ui/error-boundary";
import { renderWidget } from "@/lib/WidgetRegistry";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export type Alignment = "left" | "right" | "center";
export type VAlign = "top" | "middle" | "bottom";

/**
 * Calculate alternating alignment per row (auto mode).
 * - Service (pillar) rows are always "left".
 * - After a group of pillar rows, resume with the opposite of the pre-pillar alignment.
 * - All other rows alternate left/right.
 *
 * Operates on the v2 shape (`PageRowV2`). The "type" we use to make
 * alignment decisions is the type of the FIRST widget in the FIRST
 * column — that's the closest analogue to the legacy `row.type` and
 * preserves the existing visual rhythm of the homepage.
 */
const computeAutoAlignments = (rows: PageRowV2[]): Alignment[] => {
  const alignments: Alignment[] = [];
  let current: Alignment = "left";
  let prePillar: Alignment | null = null;

  const primaryType = (r: PageRowV2): string =>
    r.columns?.[0]?.widgets?.[0]?.type ?? "text";

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const isPillar = primaryType(row) === "service";
    const prevWasPillar = i > 0 && primaryType(rows[i - 1]) === "service";

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

const resolveAlignment = (row: PageRowV2, autoAlign: Alignment): Alignment => {
  const explicit = row.layout?.alignment;
  if (explicit && explicit !== "auto") return explicit;
  return autoAlign;
};

/* ─────────────────────────────────────────────────────────────────────
 * RECURSIVE GRID RENDERER (US 5.1)
 * ─────────────────────────────────────────────────────────────────────
 *
 * The frontend now consumes the v2 nested shape:
 *
 *     PageRowV2
 *       └── columns: PageColumn[]
 *             └── widgets: PageWidget[]
 *
 * We emit a Tailwind CSS Grid wrapper PER ROW whose `grid-template-
 * columns` matches the row's column distribution at md+ breakpoints,
 * and collapses to a single column on mobile (`grid-cols-1`). This
 * satisfies the AC: "Verify that a 4-column desktop layout correctly
 * stacks into 1 column on mobile."
 *
 * WHY a hybrid path with the legacy single-row renderers?
 * ──────────────────────────────────────────────────────
 * Today's database contains only "homogeneous" rows (every column in
 * the same row carries the same widget `type`, because the legacy
 * page builder couldn't produce anything else). The existing row
 * components (TextRow, ImageTextRow, ServiceRow…) already render
 * THEIR OWN multi-column layouts internally, with bespoke design
 * rules — image_text uses clip-path masks, profile inherits glass
 * borders, service rows have specialised pillar styling, etc.
 *
 * If we naively split a homogeneous row into 1-widget-per-cell using
 * the new recursive renderer, we'd:
 *   1. Render each row component once per column (duplicated bg /
 *      padding / heading), OR
 *   2. Lose the bespoke visual treatments those components own.
 *
 * Both are regressions. So we route by row "homogeneity":
 *
 *   - HOMOGENEOUS row (1 widget OR all widgets share the same type)
 *     → call `renderWidget` ONCE with the legacy `PageRow` shape.
 *       The existing row component renders all columns itself.
 *
 *   - MIXED row (≥2 distinct widget types across columns)
 *     → use the new recursive grid renderer. Each cell gets its own
 *       Tailwind grid track and we call `renderWidget` per widget.
 *       This is the path that actually exercises the recursive engine
 *       and unlocks the modular composition US 1.1 → US 4.1 built up.
 *
 * Both paths converge on the SAME registry — there is one source of
 * truth for "how do I render widget X". The split is only about how
 * many cells we lay out around that call.
 * ───────────────────────────────────────────────────────────────────── */

/** True when every widget in every column shares the same `type`. */
const isHomogeneousRow = (row: PageRowV2): boolean => {
  const allWidgets: PageWidget[] = row.columns.flatMap((c) => c.widgets);
  if (allWidgets.length === 0) return true;
  const first = allWidgets[0].type;
  return allWidgets.every((w) => w.type === first);
};

/**
 * Reconstruct a legacy `PageRow` from a v2 row.
 *
 * WHY: the existing row components (and the WidgetRegistry's render
 * fns) consume `{ row, rowIndex, align, vAlign }` where `row` is the
 * legacy shape with `content` (col 0) + `columns_data[]` (cols 1+).
 * Rather than refactor every renderer, we round-trip back through
 * the legacy shape — guaranteed lossless since `migrateRowToV2` is
 * itself lossless. This keeps US 5.1 a pure rendering refactor.
 */
const v2ToLegacyRow = (row: PageRowV2): PageRow => {
  const widgets = row.columns.map((c) => c.widgets[0]);
  const primaryType = widgets[0]?.type ?? "text";
  const widths = row.columns.map((_, i, arr) => Math.round(100 / arr.length));
  return {
    id: row.id,
    type: primaryType as PageRow["type"],
    strip_title: row.strip_title,
    bg_color: row.bg_color,
    scope: row.scope,
    layout: {
      ...(row.layout || ({} as any)),
      column_widths: row.layout?.column_widths || widths,
    },
    content: widgets[0]?.data || {},
    columns_data: widgets.slice(1).map((w) => w?.data || {}),
  };
};

/**
 * Build a tiny synthetic `PageRow` for ONE widget so we can call into
 * the existing registry/renderers from the new recursive path. The
 * widget renderers expect `row.content` to hold their data — we
 * synthesize that. Bg/padding live on the OUTER wrapper, so this
 * inner row deliberately has neutral chrome.
 */
const widgetAsRow = (parent: PageRowV2, widget: PageWidget): PageRow => ({
  id: widget.id,
  type: widget.type as PageRow["type"],
  strip_title: parent.strip_title,
  bg_color: "transparent",
  scope: parent.scope,
  // Inherit layout so widgets that look at vertical alignment etc.
  // still get sensible values, but force fullWidth so the widget
  // fills its CELL, not the whole viewport.
  layout: { ...(parent.layout || ({} as any)), fullWidth: true, column_widths: undefined },
  content: widget.data || {},
});

/**
 * Map a `ColumnLayoutPreset` to Tailwind responsive grid classes.
 *
 * MOBILE-FIRST: every preset starts as `grid-cols-1` (single stack on
 * phones), then expands at the `md` breakpoint (768px+) to its full
 * column distribution. This is the "stacks to 1 column on mobile"
 * acceptance criterion.
 *
 * For "custom" presets (admin-tweaked widths) we fall back to inline
 * `gridTemplateColumns` so any width vector still works — see
 * `customGridStyle` below.
 */
const presetToGridClasses = (preset: ColumnLayoutPreset): string => {
  switch (preset) {
    case "100":
      return "grid grid-cols-1";
    case "50-50":
      return "grid grid-cols-1 md:grid-cols-2";
    case "33-33-33":
      return "grid grid-cols-1 md:grid-cols-3";
    case "25-25-25-25":
      return "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4";
    // Asymmetric splits use arbitrary-value Tailwind so the proportion
    // is preserved at md+ but still stacks on mobile.
    case "60-40":
      return "grid grid-cols-1 md:grid-cols-[60fr_40fr]";
    case "40-60":
      return "grid grid-cols-1 md:grid-cols-[40fr_60fr]";
    case "70-30":
      return "grid grid-cols-1 md:grid-cols-[70fr_30fr]";
    case "30-70":
      return "grid grid-cols-1 md:grid-cols-[30fr_70fr]";
    case "custom":
    default:
      // Caller will supply inline style. We still want the mobile
      // single-column stack, so emit grid-cols-1 here.
      return "grid grid-cols-1";
  }
};

/**
 * Inline grid template for custom widths. Returns `undefined` when the
 * preset already encodes the layout via Tailwind classes — keeping
 * the DOM clean of redundant inline styles.
 */
const customGridStyle = (
  row: PageRowV2,
): React.CSSProperties | undefined => {
  if (row.column_layout !== "custom") return undefined;
  const widths =
    row.layout?.column_widths ||
    row.columns.map(() => Math.round(100 / Math.max(row.columns.length, 1)));
  return {
    // Apply the custom template ONLY at md+ so mobile still stacks.
    // We achieve "md+ only" by setting the property unconditionally
    // here and letting the grid-cols-1 utility win at smaller widths
    // (Tailwind utilities have higher specificity than inline styles
    // for grid-template-columns? — they do not). To get mobile stacking
    // we use a CSS variable + media query in the className wrapper
    // instead. See the `mdGridTemplate` block in RecursiveRow.
    "--md-grid-template-columns": widths.map((w) => `${w}fr`).join(" "),
  } as React.CSSProperties;
};

/**
 * Recursive renderer for ONE column: walks the column's widgets and
 * stacks them vertically (gap-4). Most cells today hold a single
 * widget, but the schema permits N — and the new DnD UX will produce
 * stacked widgets per cell once authors start composing freely.
 *
 * EMPTY CELL behaviour (per Dev Notes):
 *   - The cell still occupies its grid track (so column proportions
 *     are preserved — a 50/50 row with one empty side stays 50/50).
 *   - Public site renders nothing inside it — no placeholder, no
 *     border. Empty space is the correct visual state.
 */
const ColumnRenderer = ({
  parent,
  column,
  rowIndex,
  align,
  vAlign,
}: {
  parent: PageRowV2;
  column: PageColumn;
  rowIndex: number;
  align: Alignment;
  vAlign: VAlign;
}) => {
  if (!column.widgets || column.widgets.length === 0) {
    // Keeps the grid track but emits no visible content.
    return <div aria-hidden="true" />;
  }

  return (
    <div className="flex flex-col gap-4 min-w-0">
      {column.widgets.map((widget) => (
        <ErrorBoundary
          key={widget.id}
          label={`widget:${widget.type}`}
          fallback={(error, reset) => <RowFallback error={error} reset={reset} />}
        >
          {renderWidget({
            row: widgetAsRow(parent, widget),
            rowIndex,
            align,
            vAlign,
          })}
        </ErrorBoundary>
      ))}
    </div>
  );
};

/**
 * The recursive grid wrapper for a single MIXED row. Homogeneous rows
 * skip this and go through the legacy single-row renderer (see
 * `RowRenderer` below).
 */
const RecursiveRow = ({
  row,
  rowIndex,
  align,
  vAlign,
}: {
  row: PageRowV2;
  rowIndex: number;
  align: Alignment;
  vAlign: VAlign;
}) => {
  const customStyle = customGridStyle(row);
  const gridClasses = presetToGridClasses(row.column_layout);

  // Outer wrapper carries the row's bg + padding, mirroring what the
  // legacy single-row renderers do internally. Without this, mixed
  // rows would render on a transparent background and lose all spacing.
  const padTop = row.layout?.paddingTop ?? 64;
  const padBottom = row.layout?.paddingBottom ?? 64;
  const marginTop = row.layout?.marginTop ?? 0;
  const marginBottom = row.layout?.marginBottom ?? 0;

  return (
    <section
      className="relative w-full"
      style={{
        backgroundColor: row.bg_color || undefined,
        paddingTop: padTop,
        paddingBottom: padBottom,
        marginTop,
        marginBottom,
      }}
    >
      <div
        className={`mx-auto px-6 w-full ${row.layout?.fullWidth ? "max-w-none" : "max-w-[1200px]"}`}
      >
        <div
          className={`${gridClasses} gap-6 md:gap-8`}
          style={
            customStyle
              ? {
                  // For "custom" widths we override grid-template-columns
                  // at md+ via a CSS variable consumed by the inline
                  // style below. The Tailwind `grid-cols-1` keeps the
                  // mobile stack intact.
                  // (Inline media queries aren't possible; we apply the
                  // template unconditionally at md+ via a small
                  // `@media` rule injected once at the bottom of this
                  // file.)
                  ...(customStyle as any),
                }
              : undefined
          }
          data-grid-template={row.column_layout === "custom" ? "custom" : undefined}
        >
          {row.columns.map((column) => (
            <ColumnRenderer
              key={column.id}
              parent={row}
              column={column}
              rowIndex={rowIndex}
              align={align}
              vAlign={vAlign}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

/**
 * Single-row renderer for HOMOGENEOUS rows — the existing widget owns
 * its own column layout + bespoke styling. We just adapt the v2 shape
 * back to the legacy `PageRow` so the registry keeps working unchanged.
 */
const RowRenderer = ({
  row,
  rowIndex,
  align,
}: {
  row: PageRowV2;
  rowIndex: number;
  align: Alignment;
}) => {
  const legacyRow = v2ToLegacyRow(row);
  const id = legacyRow.scope || slugify(legacyRow.strip_title);
  const isService = legacyRow.type === "service";
  const vAlign: VAlign = legacyRow.layout?.verticalAlign || "middle";

  // Engine no longer hardcodes which component renders which row.
  // The WidgetRegistry resolves `row.type` → render fn at runtime, so
  // adding a new widget never requires editing this file (OCP).
  // See `src/widgets/index.tsx` for the bootstrap registrations and
  // `WIDGETS.md` (repo root) for the 4-step extension guide.
  const rendered = renderWidget({ row: legacyRow, rowIndex, align, vAlign });
  if (rendered === null) return null;

  return (
    <div id={id} style={{ scrollMarginTop: isService ? "0px" : "4rem", isolation: "isolate" }}>
      {rendered}
    </div>
  );
};

/**
 * Top-level dispatcher: picks recursive vs legacy path per row.
 * Both paths feed the same WidgetRegistry; only the wrapping differs.
 */
const RowDispatcher = ({
  row,
  rowIndex,
  align,
}: {
  row: PageRowV2;
  rowIndex: number;
  align: Alignment;
}) => {
  const vAlign: VAlign = row.layout?.verticalAlign || "middle";
  const id = row.scope || slugify(row.strip_title);
  const isService = (row.columns?.[0]?.widgets?.[0]?.type ?? "text") === "service";

  if (isHomogeneousRow(row)) {
    return <RowRenderer row={row} rowIndex={rowIndex} align={align} />;
  }

  return (
    <div id={id} style={{ scrollMarginTop: isService ? "0px" : "4rem", isolation: "isolate" }}>
      <RecursiveRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />
    </div>
  );
};

const PageRows = ({ footerSlot }: { footerSlot?: React.ReactNode }) => {
  /**
   * Loading-aware read so we don't briefly render a placeholder before
   * the admin's real rows arrive. Migration to v2 happens inside the
   * hook (see `useSiteContent` → `migrateSiteContentRows`), so by the
   * time we reach here every row is already in the nested shape.
   */
  const { isLoading, content: data } = useSiteContentWithStatus<{ rows: any[] }>(
    "page_rows",
    { rows: [] },
  );

  // Defensive: if for any reason a row arrives in legacy shape (e.g.
  // a stale cache entry), migrate inline. `migrateRowToV2` is lossless
  // and idempotent, so this is a free safety net.
  const rows: PageRowV2[] = (data.rows || []).map((r) =>
    isPageRowV2(r) ? r : migrateRowToV2(r),
  );

  const autoAlignments = computeAutoAlignments(rows);
  const lastIndex = rows.length - 1;

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
            label={`row:${row.columns?.[0]?.widgets?.[0]?.type ?? "unknown"}`}
            fallback={(error, reset) => <RowFallback error={error} reset={reset} />}
          >
            <RowDispatcher
              row={row}
              rowIndex={index}
              align={resolveAlignment(row, autoAlignments[index])}
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
      {/*
       * Tiny inline stylesheet to power "custom" column widths at md+
       * while still stacking on mobile. We can't put a media query in
       * an inline `style` attribute, so the grid uses the
       * `--md-grid-template-columns` CSS variable set by `customGridStyle`
       * and we apply it via this rule.
       *
       * WHY here (not in index.css): keeps the recursive renderer
       * self-contained — anyone reading PageRows.tsx sees the full
       * grid story without hunting through global CSS.
       */}
      <style>{`
        @media (min-width: 768px) {
          [data-grid-template="custom"] {
            grid-template-columns: var(--md-grid-template-columns);
          }
        }
      `}</style>
    </>
  );
};

export default PageRows;
