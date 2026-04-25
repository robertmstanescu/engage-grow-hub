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

import type { CSSProperties, ReactNode } from "react";
import type { WidgetDesignSettings } from "@/types/rows";

interface Props {
  design: WidgetDesignSettings;
  children: ReactNode;
  /** Optional className passthrough for callers that need extra layout hooks. */
  className?: string;
}

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
 */
export const hasDesignOverrides = (d: WidgetDesignSettings): boolean =>
  d.marginTop !== 0 || d.marginRight !== 0 || d.marginBottom !== 0 || d.marginLeft !== 0 ||
  d.paddingTop !== 0 || d.paddingRight !== 0 || d.paddingBottom !== 0 || d.paddingLeft !== 0 ||
  d.borderRadius !== 0 || !!d.bgColor;

const WidgetWrapper = ({ design, children, className }: Props) => {
  // Skip the wrapper entirely when there's nothing to apply. This keeps
  // the DOM identical to the pre-US 6.1 baseline for every widget that
  // hasn't opted into design settings — zero visual regression risk.
  if (!hasDesignOverrides(design)) return <>{children}</>;
  return (
    <div className={className} style={designToStyle(design)}>
      {children}
    </div>
  );
};

export default WidgetWrapper;
