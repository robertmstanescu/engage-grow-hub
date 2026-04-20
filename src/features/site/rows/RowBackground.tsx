import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/types/rows";
import { buildGradientCSS } from "@/features/admin/site-editor/GradientEditor";

/**
 * Default legacy radial-gradient colours per row type.
 *
 * These are used **only when no custom gradient is enabled** in the row's
 * Style tab. They reproduce the soft, decorative glow that the site shipped
 * with so existing pages keep looking the same.
 */
export const ROW_GRADIENT_DEFAULTS: Record<string, { start: string; end: string }> = {
  hero:       { start: "hsl(280 55% 20% / 0.8)",  end: "hsl(286 42% 25% / 0.5)" },
  text:       { start: "hsl(280 55% 18% / 0.5)",  end: "hsl(286 42% 20% / 0.3)" },
  service:    { start: "hsl(286 42% 30%)",        end: "hsl(280 55% 25%)"       },
  boxed:      { start: "hsl(280 55% 18% / 0.6)",  end: "hsl(286 42% 20% / 0.4)" },
  contact:    { start: "hsl(280 55% 24% / 0.3)",  end: "transparent"            },
  image_text: { start: "hsl(280 55% 20% / 0.5)",  end: "hsl(286 42% 25% / 0.3)" },
  profile:    { start: "hsl(280 55% 20% / 0.5)",  end: "hsl(286 42% 25% / 0.3)" },
  grid:       { start: "hsl(280 55% 20% / 0.5)",  end: "hsl(286 42% 25% / 0.3)" },
};

/**
 * Builds the legacy decorative-glow CSS string for a given row type using
 * its default gradient colour pair. Each row type gets a slightly different
 * shape (which corner the radial blob sits in, etc.).
 *
 * Used as the fallback when the user has NOT enabled a custom gradient in
 * the Style tab.
 */
type LegacyBuilder = (gradStart: string, gradEnd: string) => string;

const LEGACY_BUILDERS: Record<string, LegacyBuilder> = {
  hero: (gs, ge) =>
    `radial-gradient(ellipse 100% 80% at 20% 100%, ${gs}, transparent), radial-gradient(ellipse 80% 60% at 90% 10%, ${ge}, transparent), radial-gradient(ellipse 40% 30% at 60% 70%, hsl(46 75% 60% / 0.06), transparent), hsl(260 20% 4%)`,
  text: (gs, ge) =>
    `radial-gradient(ellipse 80% 60% at 30% 70%, ${gs}, transparent), radial-gradient(ellipse 60% 40% at 70% 30%, ${ge}, transparent)`,
  service: (gs, ge) =>
    // Service uses two stacked radial blobs (handled below as two layers in JSX),
    // but for completeness we expose a combined CSS string here too.
    `radial-gradient(circle at 100% 0%, ${gs}, transparent 60%), radial-gradient(circle at 0% 100%, ${ge}, transparent 60%)`,
  boxed: (gs, ge) =>
    `radial-gradient(ellipse 80% 60% at 10% 90%, ${gs}, transparent), radial-gradient(ellipse 60% 50% at 80% 20%, ${ge}, transparent), radial-gradient(ellipse 50% 40% at 50% 50%, hsl(46 75% 60% / 0.04), transparent)`,
  contact: (gs, ge) =>
    `radial-gradient(ellipse 80% 60% at 50% 50%, ${gs}, ${ge})`,
  image_text: (gs, ge) =>
    `radial-gradient(ellipse 80% 60% at 20% 80%, ${gs}, transparent), radial-gradient(ellipse 60% 50% at 80% 20%, ${ge}, transparent)`,
  profile: (gs, ge) =>
    `radial-gradient(ellipse 80% 60% at 20% 80%, ${gs}, transparent), radial-gradient(ellipse 60% 50% at 80% 20%, ${ge}, transparent)`,
  grid: (gs, ge) =>
    `radial-gradient(ellipse 80% 60% at 20% 80%, ${gs}, transparent), radial-gradient(ellipse 60% 50% at 80% 20%, ${ge}, transparent)`,
};

/**
 * Visual settings applied to the background overlay in *legacy* (no custom
 * gradient) mode. We deliberately use heavy blur + low opacity here because
 * the legacy gradients are decorative atmospheric glows, not hard shapes.
 *
 * When a custom gradient IS enabled, we render it at full strength with no
 * blur — otherwise a sharp linear/conic gradient becomes invisible.
 */
const LEGACY_OVERLAY_OPACITY: Record<string, number> = {
  hero: 1,        // Hero applies bgCss directly to <section>, no overlay div needed
  text: 0.4,
  service: 0.4,   // Aligned with other rows so picked colors actually paint on screen
  boxed: 0.6,
  contact: 0.3,
  image_text: 0.4,
  profile: 0.4,
  grid: 0.4,
};

/**
 * <RowBackground/> — the single source of truth for background overlays on
 * every page row.
 *
 * ## Why this component exists
 *
 * Before this existed, every row component (Hero, Text, Service, Boxed,
 * Contact, Image+Text, Profile, Grid) had its own copy of the absolute-inset
 * overlay div. They all hardcoded `opacity-XX blur-[YYpx]`, which was fine
 * for the soft radial decoration the site shipped with — but it made any
 * **custom gradient** the user configured in the admin Style tab look
 * invisible (a sharp linear gradient blurred at 100px opacity 0.3 looks
 * like nothing changed).
 *
 * Only ServiceRow had logic to switch off the blur/opacity when a custom
 * gradient was enabled, which is why "it only worked on Employee Experience".
 *
 * ## How it works
 *
 * 1. If `layout.gradient.enabled === true` and there are ≥2 stops →
 *    render the custom gradient at full strength, no blur, no opacity.
 * 2. Otherwise → render the row-type-specific decorative legacy gradient
 *    at the legacy opacity/blur, so existing pages look identical.
 *
 * ## Data flow
 *
 *  Admin Style tab
 *    → writes `row.layout.gradient` (GradientConfig) to DB
 *    → useSiteContent loads `row` from DB
 *    → <RowBackground row={row} /> reads it
 *    → renders one absolute-inset div with the right CSS
 */
interface RowBackgroundProps {
  row: PageRow;
  /**
   * Optional override of the default legacy gradient. Most rows should leave
   * this undefined and rely on `ROW_GRADIENT_DEFAULTS[row.type]`.
   */
  legacyDefaults?: { start: string; end: string };
}

const RowBackground = ({ row, legacyDefaults }: RowBackgroundProps) => {
  const layout = { ...DEFAULT_ROW_LAYOUT, ...row.layout };
  const hasCustomGradient =
    layout.gradient?.enabled === true && (layout.gradient.stops?.length ?? 0) >= 2;

  if (hasCustomGradient) {
    // Custom gradient: render at FULL strength so the user actually sees
    // their configured colours. No blur, no opacity attenuation.
    return (
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: buildGradientCSS(layout.gradient!) }}
      />
    );
  }

  // Legacy decorative glow — soft, atmospheric, blurred.
  const builder = LEGACY_BUILDERS[row.type] ?? LEGACY_BUILDERS.text;
  const defaults = legacyDefaults ?? ROW_GRADIENT_DEFAULTS[row.type] ?? ROW_GRADIENT_DEFAULTS.text;
  const opacity = LEGACY_OVERLAY_OPACITY[row.type] ?? 0.4;
  const gradStart = layout.gradientStart || defaults.start;
  const gradEnd = layout.gradientEnd || defaults.end;

  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none blur-[100px]"
      style={{
        background: builder(gradStart, gradEnd),
        opacity,
        transform: "translateZ(0)",
        willChange: "transform",
      }}
    />
  );
};

export default RowBackground;
