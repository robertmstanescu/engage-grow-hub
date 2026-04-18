import type { CSSProperties, ReactNode } from "react";
import type { PageRow } from "@/types/rows";
import { getRowBgColor, getRowBgImageStyle } from "../rowBackground";
import RowBackground from "../RowBackground";
import type { VAlign } from "../PageRows";

interface Props {
  row: PageRow;
  children: ReactNode;
  /** Forwarded to the underlying ref. Used by useScrollReveal / useAutoFitText. */
  innerRef?: (el: HTMLElement | null) => void;
  /** Vertical content alignment within the row. */
  vAlign?: VAlign;
  /** Default background color when the row has none configured. */
  defaultBg?: string;
  /** Extra className appended to the section wrapper (rare — try not to need this). */
  className?: string;
  /** Extra style merged onto the section wrapper. */
  style?: CSSProperties;
  /** Apply the .grain overlay. Most rows use it; light sections sometimes opt out. */
  grain?: boolean;
  /** Render the section as `min-h-screen` (default) or as auto-height. */
  fullHeight?: boolean;
  /** Marks for scroll-reveal targeting / admin row navigation. */
  dataRowId?: string;
  dataRowType?: string;
  dataRowTitle?: string;
}

/**
 * <RowSection/> — the standardised <section> wrapper for every CMS row.
 *
 * ## Why this exists
 * Before this component, every row component had ~10 lines of identical
 * `<section>` boilerplate:
 *
 *   className="snap-section grain relative min-h-screen flex
 *              ${vAlign === 'top' ? 'items-start' : ...} justify-center"
 *   style={{ backgroundColor: getRowBgColor(row, ...), isolation: ...,
 *            padding: '24px 0', ...getRowBgImageStyle(row) }}
 *   <RowBackground row={row} />
 *
 * Seven copies. Seven chances to drift. One source of truth here.
 *
 * ## Design choices (the "why")
 *
 * - **`min-h-screen`**: every CMS row should be a full-viewport "section"
 *   — that's the snap-scroll experience the brand was designed around.
 *   Pages that need shorter rows can opt out via `fullHeight={false}`.
 *
 * - **`py-row` (mobile) / `py-row-md` (desktop)**: standard breathing
 *   room. Defined in tailwind.config.ts under `spacing.row` and
 *   `spacing.row-md`. ALL rows now share the same vertical padding.
 *
 * - **`isolation: isolate`**: creates a new stacking context so absolutely-
 *   positioned overlays (RowBackground, decorative blobs) cannot leak above
 *   the navbar or below the next row.
 *
 * - **`scroll-snap-align: center`** (via `.snap-section`): rows snap to
 *   centre on desktop, start on mobile (handled in index.css).
 *
 * - **`<RowBackground/>` rendered as the first child**: ensures custom
 *   gradients and decorative blurs sit BEHIND content, never above it.
 */
const RowSection = ({
  row,
  children,
  innerRef,
  vAlign = "middle",
  defaultBg = "hsl(var(--background))",
  className = "",
  style,
  grain = true,
  fullHeight = true,
  dataRowId,
  dataRowType,
  dataRowTitle,
}: Props) => {
  const vAlignClass =
    vAlign === "top" ? "items-start"
    : vAlign === "bottom" ? "items-end"
    : "items-center";

  return (
    <section
      ref={innerRef}
      data-row-id={dataRowId ?? row.id}
      data-row-type={dataRowType ?? row.type}
      data-row-title={dataRowTitle ?? row.strip_title}
      className={`snap-section ${grain ? "grain" : ""} relative ${fullHeight ? "min-h-screen" : ""} flex flex-col justify-center ${vAlignClass} py-row md:py-row-md ${className}`}
      style={{
        backgroundColor: getRowBgColor(row, defaultBg),
        isolation: "isolate",
        scrollMarginTop: "0px",
        ...getRowBgImageStyle(row),
        ...style,
      }}
    >
      <RowBackground row={row} />
      {children}
    </section>
  );
};

export default RowSection;
