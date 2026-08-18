import type { SectionShapeConfig, SectionShapeKind, SectionShapeSize } from "@/types/rows";

/**
 * <SectionShape/> — decorative top/bottom edge for a CMS row.
 *
 * ## Why
 * Flat stacked bands read as a wireframe. A single curved or angled
 * edge makes the page feel composed — a section "lifting" over the one
 * above it (the rounded-card look), a soft wave into a deep plum band,
 * an editorial arch above a statement.
 *
 * ## How it works
 * The SVG is absolutely positioned OUTSIDE the section (translated
 * fully above the top edge / below the bottom edge) and filled with the
 * SECTION's own surface colour. The result reads as one continuous
 * surface whose edge is shaped, rather than a separate decoration.
 *
 * Rows on the transparent page-mesh band don't render a shape (there is
 * no surface to shape) — that check lives in RowSection.
 *
 * Accessibility: purely decorative, so `aria-hidden` + `focusable=false`.
 */

/** Shape heights in px. Mobile flattens all of them to 28px via CSS. */
const SIZE_PX: Record<SectionShapeSize, number> = {
  subtle: 40,
  medium: 72,
  dramatic: 120,
};

/**
 * Path data per shape, drawn in a 1200×120 viewBox where the BOTTOM
 * edge (y=120) is flush with the section and the top edge is the shape.
 */
const PATHS: Record<Exclude<SectionShapeKind, "none" | "rounded">, string> = {
  // Soft single-crest wave.
  wave: "M0,120 L0,74 C180,10 380,10 600,52 C820,94 1020,94 1200,44 L1200,120 Z",
  // One wide dome — calm and editorial.
  arch: "M0,120 L0,110 C300,0 900,0 1200,110 L1200,120 Z",
  // Clean diagonal cut.
  angled: "M0,120 L0,120 L1200,0 L1200,120 Z",
  // Gentle concave scoop, subtler than the wave.
  taper: "M0,120 L0,30 C400,120 800,120 1200,30 L1200,120 Z",
  // Small centred cut-out — good above a section that opens with an icon.
  notch: "M0,120 L0,26 L480,26 C520,26 540,96 600,96 C660,96 680,26 720,26 L1200,26 L1200,120 Z",
};

interface Props {
  edge: "top" | "bottom";
  config?: SectionShapeConfig;
  /** The section's own surface colour (CSS colour string). */
  color: string;
}

const SectionShape = ({ edge, config, color }: Props) => {
  const kind = config?.kind ?? "none";
  if (!kind || kind === "none") return null;

  const size = config?.size ?? "medium";

  /* ── Rounded ──
   *  Not an SVG: a solid cap painted in the row's colour, sitting fully
   *  OUTSIDE the section (above for a top edge, below for a bottom one)
   *  with its outer corners rounded. The row therefore climbs over its
   *  neighbour instead of having its own corners cut away (which used to
   *  let the page mesh show through at the seam). */
  if (kind === "rounded") {
    const radius = { subtle: 24, medium: 48, dramatic: 80 }[size];
    return (
      <div
        aria-hidden
        className="section-shape"
        data-edge={edge}
        data-kind="rounded"
        style={{
          height: radius,
          backgroundColor: color,
          borderTopLeftRadius: edge === "top" ? radius : undefined,
          borderTopRightRadius: edge === "top" ? radius : undefined,
          borderBottomLeftRadius: edge === "bottom" ? radius : undefined,
          borderBottomRightRadius: edge === "bottom" ? radius : undefined,
        }}
      />
    );
  }

  const path = PATHS[kind];
  if (!path) return null;


  return (
    <svg
      aria-hidden
      focusable="false"
      role="presentation"
      className="section-shape"
      data-edge={edge}
      data-flip={config?.flip ? "true" : undefined}
      viewBox="0 0 1200 120"
      preserveAspectRatio="none"
      style={{ height: SIZE_PX[size] }}
    >
      <path d={path} fill={color} />
    </svg>
  );
};

/** Rounded cap heights (px) per size. */
const ROUNDED_PX: Record<SectionShapeSize, number> = {
  subtle: 24,
  medium: 48,
  dramatic: 80,
};

/**
 * Painted height (px) of a configured edge shape. Mobile flattens SVG
 * shapes to 28px and rounded caps to 24px (see index.css), so the
 * compensation padding must use the same numbers.
 */
export const shapeHeightPx = (
  config: SectionShapeConfig | undefined,
  isMobile = false
): number => {
  const kind = config?.kind ?? "none";
  if (!kind || kind === "none") return 0;
  const size = config?.size ?? "medium";
  if (kind === "rounded") return isMobile ? 24 : ROUNDED_PX[size];
  if (!PATHS[kind]) return 0;
  return isMobile ? 28 : SIZE_PX[size];
};

/**
 * Border radius (px) applied to the section itself for the
 * "rounded card" shape — the section lifts as a big rounded rectangle
 * over its neighbour, matching the reference design.
 */
export const roundedRadius = (config?: SectionShapeConfig): number => {
  if (config?.kind !== "rounded") return 0;
  return ROUNDED_PX[config.size ?? "medium"];
};

export default SectionShape;

