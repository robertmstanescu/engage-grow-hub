/**
 * ════════════════════════════════════════════════════════════════════
 * WidgetWrapper — generic visual chrome around every rendered widget
 * ════════════════════════════════════════════════════════════════════
 *
 * WHY THIS EXISTS (US 6.1 — "The Inspector")
 * ──────────────────────────────────────────
 * Before this wrapper, EVERY widget that needed background colour,
 * margin or padding had to re-implement its own fields, its own admin
 * controls, and its own inline-style plumbing (e.g. `HeroEditor` had a
 * hardcoded `bg_color`). That's both repetitive and a maintenance trap:
 * adding a "border-radius" knob would mean editing N admin components.
 *
 * By extracting these concerns to a wrapper, every widget — current
 * AND future — automatically inherits a consistent, JSON-driven set of
 * design controls. Widget authors get to focus on the widget's UNIQUE
 * concerns (typography, fields, behaviour) without ever touching the
 * boilerplate of margin/padding/bg/radius again.
 *
 * Read the design settings via `readDesignSettings(row.content)` so
 * partial / legacy / corrupted JSON degrades gracefully to "no styling".
 */

import { useId, type CSSProperties, type ReactNode } from "react";
import type { WidgetDesignSettings } from "@/types/rows";

interface Props {
  design: WidgetDesignSettings;
  children: ReactNode;
  /** Optional className passthrough for callers that need extra layout hooks. */
  className?: string;
}

/**
 * Rewrite the `&` parent-selector token in user-authored CSS to a
 * per-instance class so the rules cannot bleed onto other widgets.
 *
 * Strategy: a single regex pass replacing every standalone `&` with
 * `.<scope>`. We match `&` only when it's NOT followed by another
 * identifier character so we don't break unlikely identifiers that
 * legitimately contain `&` (none in vanilla CSS, but defensive).
 *
 * SECURITY NOTE: this is presentation-only. We do NOT sanitise CSS
 * values — admins are trusted authors here (the field lives behind the
 * admin auth boundary). If this ever ships to non-admin authors, swap
 * in a real CSS parser.
 */
const scopeCss = (raw: string, scope: string): string => {
  if (!raw) return "";
  return raw.replace(/&/g, `.${scope}`);
};

/**
 * Translate the JSON-friendly `WidgetDesignSettings` into a flat
 * `CSSProperties` object. Kept as a separate function so the admin
 * preview can use the IDENTICAL transform — guaranteeing the editor
 * "what you see is what you get".
 */
export const designToStyle = (d: WidgetDesignSettings): CSSProperties => {
  const style: CSSProperties = {
    marginTop: d.marginTop || undefined,
    marginRight: d.marginRight || undefined,
    marginBottom: d.marginBottom || undefined,
    marginLeft: d.marginLeft || undefined,
    paddingTop: d.paddingTop || undefined,
    paddingRight: d.paddingRight || undefined,
    paddingBottom: d.paddingBottom || undefined,
    paddingLeft: d.paddingLeft || undefined,
    borderRadius: d.borderRadius || undefined,
  };
  // Only set bg when explicitly provided — empty string == "transparent
  // / inherit from row", which is the safest fallback for legacy rows.
  if (d.bgColor) style.backgroundColor = d.bgColor;
  return style;
};

/**
 * Returns true when the design settings would actually paint something
 * onto the page. Used by the engine to skip the wrapper DIV entirely
 * when there's nothing to apply — preserves the exact pre-US 6.1 DOM
 * for un-customised rows so existing visual regressions are zero.
 *
 * NOTE: visibility flags are NOT counted here — they're handled
 * separately in `visibilityClass()` because hiding a widget requires
 * a real DOM node to attach the `hidden` / `md:hidden` class to.
 */
export const hasDesignOverrides = (d: WidgetDesignSettings): boolean =>
  d.marginTop !== 0 || d.marginRight !== 0 || d.marginBottom !== 0 || d.marginLeft !== 0 ||
  d.paddingTop !== 0 || d.paddingRight !== 0 || d.paddingBottom !== 0 || d.paddingLeft !== 0 ||
  d.borderRadius !== 0 || !!d.bgColor;

/**
 * Translate the responsive `visibility` flags into Tailwind classes.
 *
 * Truth table (md = ≥768px = "desktop"):
 *
 *   mobile | desktop | classes        | rendered?
 *   ------ | ------- | -------------- | --------------
 *    true  |  true   | (none)         | always
 *    true  |  false  | "md:hidden"    | mobile only
 *    false |  true   | "hidden md:block" | desktop only
 *    false |  false  | "hidden"       | never (admin choice — we
 *                                       still respect it; no auto-fix)
 *
 * WHY return a string and not raw booleans: callers compose this with
 * other classNames (e.g. flex utilities). A string slots into the
 * existing `cn(...)` pattern with zero ceremony.
 */
export const visibilityClass = (d: WidgetDesignSettings): string => {
  const { mobile, desktop } = d.visibility;
  if (mobile && desktop) return "";
  if (mobile && !desktop) return "md:hidden";
  if (!mobile && desktop) return "hidden md:block";
  return "hidden";
};

/**
 * True when ANY visibility toggle is off. Used by the engine to decide
 * whether we MUST emit a wrapper DIV (so the responsive class has a
 * node to live on) even when no other design overrides are set.
 */
export const hasVisibilityOverride = (d: WidgetDesignSettings): boolean =>
  !d.visibility.mobile || !d.visibility.desktop;

const WidgetWrapper = ({ design, children, className }: Props) => {
  const visClass = visibilityClass(design);
  const hasStyles = hasDesignOverrides(design);

  // Skip the wrapper entirely when there's nothing to apply. This keeps
  // the DOM identical to the pre-US 6.1 baseline for every widget that
  // hasn't opted into design settings — zero visual regression risk.
  // We only short-circuit when BOTH there are no styles AND no
  // visibility overrides, otherwise we'd have nowhere to put the
  // responsive `hidden` classes.
  if (!hasStyles && !visClass) return <>{children}</>;

  const composedClass = [className, visClass].filter(Boolean).join(" ") || undefined;
  return (
    <div className={composedClass} style={hasStyles ? designToStyle(design) : undefined}>
      {children}
    </div>
  );
};

export default WidgetWrapper;
