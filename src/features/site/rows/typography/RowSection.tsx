import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { PageRow } from "@/types/rows";
import { getRowBgColor } from "../rowBackground";
import { renderOverlayElements } from "@/features/admin/site-editor/OverlayEditor";
import type { VAlign } from "../PageRows";
import { resolveRowForeground } from "@/lib/rowForeground";
import SectionShape, { shapeHeightPx } from "../SectionShape";
import { resolveRowMinHeight } from "@/lib/rowHeight";

/** Tracks the same breakpoint index.css uses to flatten shapes. */
const useFlatShapes = () => {
  const [flat, setFlat] = useState(
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const onChange = () => setFlat(mql.matches);
    mql.addEventListener("change", onChange);
    setFlat(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return flat;
};



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
 *            padding: '24px 0' }}
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
  className = "text-black",
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

  /* ── Custom CSS injection (Epic 2 — US 2.2) ──────────────────────
   *  Admins can author scoped CSS per row using the `&` token. We
   *  rewrite `&` to `#row-<row.id>` and emit an inline <style> block
   *  RIGHT BEFORE the section so the rules cannot leak to other rows.
   *
   *  Security: we strip <script> / </script> defensively. React already
   *  blocks DOM XSS via `dangerouslySetInnerHTML` at the JSX level, but
   *  raw CSS can still load remote assets via `url(...)` — admins are
   *  the trusted authors here (auth-gated input), so we don't sanitise
   *  values, only the obvious script-tag sneak.                       */
  const rawCss = row.customCss?.trim();
  const rowDomId = rawCss ? `row-${row.id}` : undefined;
  const scopedCss = rawCss
    ? rawCss.replace(/<\/?script[^>]*>/gi, "").replace(/&/g, `#${rowDomId}`)
    : "";

  const snapEnabled = row.layout?.snapEnabled === true;

  /* ── Surface ────────────────────────────────────────────────────
   *  There is exactly ONE background on the site: the fixed page mesh
   *  (see .page-mesh-layer in index.css), whose colours come from the
   *  Hero row. A row paints nothing unless an admin picks a plain
   *  colour for it, in which case that colour wins and the text flips
   *  to a readable tone.                                            */
  const hasOwnPaint = Boolean(row.bg_color);
  const surfaceColor = getRowBgColor(row);
  /* Transparent rows inherit `--page-fg`, which PageRows derives from the
     hero's mesh brightness — so a dark mesh flips them to light text. */
  const bandFg = hasOwnPaint
    ? resolveRowForeground(row)
    : "var(--page-fg, hsl(var(--foreground)))";

  /* ── Section shapes ──
   *  Decorative curved / angled edges, off by default. The shape is
   *  painted in THIS row's own colour and sits OUTSIDE the section, so
   *  the row's surface bleeds up over the section above (top edge) or
   *  down over the section below (bottom edge). A transparent row has
   *  no surface to extend, so it renders no shape. */
  const shapeTop = hasOwnPaint ? row.layout?.shapeTop : undefined;
  const shapeBottom = hasOwnPaint ? row.layout?.shapeBottom : undefined;
  /* A row that spills an edge must always paint ABOVE its neighbours —
   * including the footer — otherwise the overhang gets covered. */
  const hasShape = Boolean(shapeTop || shapeBottom);

  /* ── Optical centring ──
   *  A cap paints OUTSIDE the section, so a row with only a bottom edge
   *  has more coloured surface below the content than above it. Add the
   *  opposite padding by the shape's own height so the content sits in
   *  the middle of the total painted mass. Two shapes cancel out. */
  const flatShapes = useFlatShapes();
  const topShapeH = shapeHeightPx(shapeTop, flatShapes);
  const bottomShapeH = shapeHeightPx(shapeBottom, flatShapes);
  const basePad = "clamp(72px, 8vw, 128px)";

  /* Hairline separator on the top edge — independent of shapes so a row
   * can have a plain rule without taking on a decorative curve. */
  const dividerTop = row.layout?.dividerTop || "none";

  /* Admin-chosen row height (Style ▸ Height). Applied as a MIN height so
   * content can still grow past it. Overrides the snap full-height class. */
  const minHeight = resolveRowMinHeight(row.layout);


  return (
    <>
      {scopedCss && <style dangerouslySetInnerHTML={{ __html: scopedCss }} />}
      <section
        ref={innerRef}
        id={rowDomId}
        data-row-id={dataRowId ?? row.id}
        data-row-type={dataRowType ?? row.type}
        data-row-title={dataRowTitle ?? row.strip_title}
        data-snap-enabled={snapEnabled ? "true" : undefined}
        className={`snap-section ${grain && !hasOwnPaint ? "grain" : ""} relative ${fullHeight && snapEnabled ? "min-h-screen" : ""} flex flex-col justify-center ${vAlignClass} py-row-fluid ${className}`}
        style={{
          backgroundColor: surfaceColor,
          zIndex: hasShape ? 2 : undefined,
          ...(minHeight ? { minHeight } : null),
          ...(bottomShapeH ? { paddingTop: `calc(${basePad} + ${bottomShapeH}px)` } : null),
          ...(topShapeH ? { paddingBottom: `calc(${basePad} + ${topShapeH}px)` } : null),

          scrollMarginTop: "0px",
          /*
           * `--row-fg` is the readable text colour for this row's
           * effective background. Title/Subtitle/Body/Eyebrow default
           * to this var, so swapping the row's bg colour automatically
           * flips the text to a contrasting tone. Per-row colour
           * pickers in the admin still override via the `color` prop.
           */
          ["--row-fg" as string]: bandFg,
          /* Derived tones so muted copy and hairlines follow the row's
             foreground too (dark row ⇒ light text AND light rules). */
          ["--row-fg-muted" as string]: `color-mix(in srgb, ${bandFg} 68%, transparent)`,
          ["--row-border" as string]: `color-mix(in srgb, ${bandFg} 22%, transparent)`,
          ...style,
        }}
      >

        {/*
          LAYER ORDER (bottom → top):
          1. The section's own flat `backgroundColor` (or nothing, so the
             single fixed page mesh shows through)
          2. Overlay elements     — z-[-1]: decorative PNGs (logos, shapes)
          3. {children}           — actual row content, on top of everything
          There is deliberately NO per-row gradient / glow / image layer:
          one plain colour per row is the whole contract.
        */}
        {dividerTop !== "none" ? (
          <div aria-hidden className="absolute inset-x-0 top-0 z-[1] pointer-events-none">
            {dividerTop === "content" ? (
              <div className="row-container mx-auto max-w-[1280px]">
                <div className="border-t row-border" />
              </div>
            ) : (
              <div className="border-t row-border" />
            )}
          </div>
        ) : null}
        {shapeTop ? (
          <SectionShape edge="top" config={shapeTop} color={surfaceColor || "transparent"} />
        ) : null}
        {shapeBottom ? (
          <SectionShape edge="bottom" config={shapeBottom} color={surfaceColor || "transparent"} />
        ) : null}
        {row.layout?.overlays?.length ? (
          <div className="absolute inset-0 pointer-events-none z-[-1] overflow-hidden">
            {renderOverlayElements(row.layout.overlays)}
          </div>
        ) : null}
        {children}
      </section>
    </>
  );

};

export default RowSection;
