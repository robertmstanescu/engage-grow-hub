import { type CSSProperties, type ReactNode } from "react";
import { safeCss } from "@/services/safeCss";
import type { PageRow } from "@/types/rows";
import { getRowBgColor } from "../rowBackground";
import { renderOverlayElements } from "@/features/site/rows/overlayRender";
import type { VAlign } from "../PageRows";
import { applyTextTone, resolveRowForeground } from "@/lib/rowForeground";
import { LIGHT_FG } from "@/lib/pickForeground";
import { resolveRowMinHeight } from "@/lib/rowHeight";
import { useInsideRowSurface } from "../RowSurfaceContext";

interface Props {
  row: PageRow;
  children: ReactNode;
  /** Forwarded to the underlying ref. Used by useScrollReveal. */
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
  /**
   * Edge-to-edge row: removes the section's vertical padding so the
   * content can paint the full band (page-breaker image rows).
   */
  bleed?: boolean;
  /**
   * Removes top padding so a row-level cover image can sit flush with
   * the section's top edge and the content follows underneath.
   */
  flushTop?: boolean;
  /**
   * Treat the admin height as an EXACT height (crop) rather than a
   * minimum. Used by image bands so "Small" really is small.
   */
  exactHeight?: boolean;
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
  bleed = false,
  flushTop = false,
  exactHeight = false,

  dataRowId,
  dataRowType,
  dataRowTitle,
}: Props) => {
  const insideRowSurface = useInsideRowSurface();
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
    ? safeCss(rawCss).replace(/&/g, `#${rowDomId}`)
    : "";

  const snapEnabled = row.layout?.snapEnabled === true;

  /* ── Surface ────────────────────────────────────────────────────
   *  There is exactly ONE background on the site: the fixed page mesh
   *  (see .page-mesh-layer in index.css), whose colours come from the
   *  Hero row. A row paints nothing unless an admin picks a plain
   *  colour for it, in which case that colour wins and the text flips
   *  to a readable tone.                                            */
  const hasOwnPaint = Boolean(row.bg_color);
  /* Glass look: a translucent, blurred panel — the page mesh shows
     through, so it does NOT count as own paint (text tone still follows
     the mesh) but it does paint a surface colour. */
  const isGlass = row.layout?.glass === true;
  const surfaceColor = isGlass ? "hsl(var(--glass-bg))" : getRowBgColor(row);
  /* Transparent rows inherit `--page-fg`, which PageRows derives from the
     hero's mesh brightness — so a dark mesh flips them to light text. */
  const bandFg = applyTextTone(
    row,
    hasOwnPaint ? resolveRowForeground(row) : "var(--page-fg, hsl(var(--foreground)))",
  );
  /* Weight→colour mapping (redesign §2.2): on light surfaces headings
     take the violet --heading token, body the softer --body token and
     eyebrows the legible --gold-text; on dark surfaces all three follow
     the light foreground (the eyebrow takes the bright gold fill, which
     reads well on deep plum). A transparent row sits on the light page
     mesh, so it counts as a light surface. */
  const darkSurface = bandFg === LIGHT_FG || bandFg.includes("--accent");
  const rowHeading = darkSurface ? bandFg : "hsl(var(--heading))";
  const rowBody = darkSurface ? bandFg : "hsl(var(--body))";
  const rowEyebrow = darkSurface ? "hsl(var(--gold))" : "hsl(var(--gold-text))";

  /* ── Surface corner radius ──
   *  One curve scale for every row surface, OFF unless an admin picks a
   *  size in Style ▸ Corners (glass panels default to medium). The old
   *  decorative edge shapes and the ink outline were retired with the
   *  redesign: sections float on the mesh with no dark frame. */
  const radiusValue = { none: 0, subtle: 16, medium: 24, dramatic: 48 }[
    row.layout?.surfaceRadius || (isGlass ? "medium" : "none")
  ];
  const applyRadius = radiusValue > 0;
  const radiusStyle: CSSProperties | null = applyRadius
    ? {
        borderTopLeftRadius: radiusValue,
        borderTopRightRadius: radiusValue,
        /* Bottom corners stay square: rows stack like cards, and the next
           card's lip covers this one's foot. Rounding it drew a second
           curve just above the lip and broke the stack. A bottom edge
           stays square by design. */
        borderBottomLeftRadius: isGlass ? radiusValue : 0,
        borderBottomRightRadius: isGlass ? radiusValue : 0,
      }
    : null;


  /* Hairline separator on the top edge — independent of shapes so a row
   * can have a plain rule without taking on a decorative curve. */
  const dividerTop = row.layout?.dividerTop || "none";

  /* Admin-chosen row height (Style ▸ Height). Applied as a MIN height so
   * content can still grow past it — unless the row asked for an exact
   * (cropping) band, as image page-breakers do. */
  const heightValue = resolveRowMinHeight(row.layout);
  const heightStyle = heightValue
    ? exactHeight
      ? { height: heightValue, minHeight: heightValue, overflow: "hidden" as const }
      : { minHeight: heightValue }
    : null;

  /* The row already painted its own surface around every widget: render
     as a bare, transparent content block (no colour, no shapes, no
     height, no vertical padding) so a multi-widget row reads as ONE
     continuous band with a single rounded edge. */
  if (insideRowSurface) {
    return (
      <>
        {scopedCss && <style dangerouslySetInnerHTML={{ __html: scopedCss }} />}
        <div
          ref={innerRef}
          id={rowDomId}
          data-row-id={dataRowId ?? row.id}
          data-row-type={dataRowType ?? row.type}
          data-row-title={dataRowTitle ?? row.strip_title}
          className={`relative w-full flex flex-col justify-center ${vAlignClass} ${className}`}
          style={style}
        >
          {row.layout?.overlays?.length ? (
            <div className="row-overlay-layer absolute inset-0 pointer-events-none overflow-hidden">
              {renderOverlayElements(row.layout.overlays)}
            </div>
          ) : null}
          {children}
        </div>
      </>
    );
  }

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
        /* Column count of a v3 row, so CSS can tighten the gutters that
           side-by-side widgets would otherwise double up between them. */
        data-columns={(() => { const cols = (row as unknown as { columns?: unknown[] }).columns; return Array.isArray(cols) ? cols.length : undefined; })()}
        className={`snap-section ${grain && !hasOwnPaint ? "grain" : ""} relative ${fullHeight && snapEnabled ? "min-h-screen" : ""} flex flex-col justify-center ${vAlignClass} ${bleed ? "" : "py-row-fluid"} ${className}`}
        style={{
          backgroundColor: surfaceColor,
          ...heightStyle,
          ...(bleed
            ? { paddingTop: 0, paddingBottom: 0 }
            : {
                ...(flushTop ? { paddingTop: 0 } : null),
              }),


          scrollMarginTop: "0px",
          /*
           * `--row-fg` is the readable text colour for this row's
           * effective background. Title/Subtitle/Body/Eyebrow default
           * to this var, so swapping the row's bg colour automatically
           * flips the text to a contrasting tone. Per-row colour
           * pickers in the admin still override via the `color` prop.
           */
          ["--row-fg" as string]: bandFg,
          ["--row-heading" as string]: rowHeading,
          ["--row-body" as string]: rowBody,
          ["--row-eyebrow" as string]: rowEyebrow,
          /* Named title accent (.mc-accent): gold on dark, link purple on light. */
          ["--row-accent" as string]: darkSurface ? "hsl(var(--gold))" : "hsl(var(--link))",
          /* Derived tones so muted copy and hairlines follow the row's
             foreground too (dark row ⇒ light text AND light rules). */
          ["--row-fg-muted" as string]: `color-mix(in srgb, ${bandFg} 68%, transparent)`,
          ["--row-border" as string]: `color-mix(in srgb, ${bandFg} 22%, transparent)`,
          /* A card surface that sits on THIS row: the row's own colour
             lifted slightly toward its foreground, so cards stay light
             on light rows and dark on dark ones. */
          ["--row-surface" as string]: `color-mix(in srgb, ${surfaceColor || "hsl(var(--background))"} 94%, ${bandFg})`,
          /* Surface corners: shared scale, content clipped to the curve. */
          ...(radiusStyle ?? null),
          ...(applyRadius ? { overflow: "hidden" } : null),
          /* Glass look (artboards: world map, work teaser panels): an
             INSET frosted panel, clear of the viewport edges, rounded on
             all four corners. Never a full-bleed band. */
          ...(isGlass
            ? {
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                border: "1px solid hsl(var(--glass-border))",
                boxShadow: "var(--shadow-card)",
                marginInline: "clamp(16px, 3vw, 48px)",
                marginBlock: "clamp(24px, 3vw, 48px)",
              }
            : null),
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
        {row.layout?.overlays?.length ? (
          <div className="row-overlay-layer absolute inset-0 pointer-events-none overflow-hidden">
            {renderOverlayElements(row.layout.overlays)}
          </div>
        ) : null}
        {children}
      </section>
    </>
  );

};

export default RowSection;
