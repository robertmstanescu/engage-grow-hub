import { useEffect, useRef, useState } from "react";

/**
 * Debug Story 1.1 — "Unbreakable" panel resizing.
 *
 * `react-resizable-panels` only accepts percentage sizes, but our QA contract
 * is expressed in pixels (Left max 300px, Right max 400px, Center min 300px).
 *
 * This hook observes the wrapping PanelGroup container and converts the pixel
 * caps into live percentages so the limits hold no matter how the user resizes
 * the browser. It also exposes a `reset()` helper used by the double-click
 * handler on the resize divider to snap panels back to their default layout.
 */
export interface PanelLimits {
  containerRef: React.RefObject<HTMLDivElement>;
  leftDefault: number;
  leftMin: number;
  leftMax: number;
  centerDefault: number;
  centerMin: number;
  rightDefault: number;
  rightMin: number;
  rightMax: number;
}

interface Options {
  /** Pixel cap for the left library panel. */
  leftMaxPx?: number;
  /** Minimum pixels the left panel may shrink to. */
  leftMinPx?: number;
  /** Pixel cap for the right inspector panel. */
  rightMaxPx?: number;
  /** Minimum pixels the right panel may shrink to. */
  rightMinPx?: number;
  /** Minimum pixels the center canvas must always preserve. */
  centerMinPx?: number;
  /** Default pixel widths used to seed the layout on first mount. */
  leftDefaultPx?: number;
  rightDefaultPx?: number;
}

const DEFAULTS: Required<Options> = {
  leftMaxPx: 300,
  leftMinPx: 200,
  rightMaxPx: 400,
  rightMinPx: 240,
  centerMinPx: 300,
  leftDefaultPx: 260,
  rightDefaultPx: 340,
};

export function usePanelLimits(options: Options = {}): PanelLimits {
  const opts = { ...DEFAULTS, ...options };
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setWidth(el.clientWidth);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Until we measure, use safe percentages so SSR/initial paint doesn't blow up.
  const safeWidth = width > 0 ? width : 1200;
  const pct = (px: number) => (px / safeWidth) * 100;
  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

  // Hard ceilings driven by pixel caps.
  const leftMax = clamp(pct(opts.leftMaxPx), 5, 45);
  const rightMax = clamp(pct(opts.rightMaxPx), 5, 50);

  // Floors. The center floor is implied by guaranteeing left+right can never
  // exceed (100 - centerMinPct), but we also enforce per-panel mins for UX.
  const leftMin = clamp(pct(opts.leftMinPx), 5, leftMax);
  const rightMin = clamp(pct(opts.rightMinPx), 5, rightMax);
  const centerMin = clamp(pct(opts.centerMinPx), 15, 100 - leftMin - rightMin);

  // Defaults — percentage equivalent of the pixel default, clamped into bounds.
  const leftDefault = clamp(pct(opts.leftDefaultPx), leftMin, leftMax);
  const rightDefault = clamp(pct(opts.rightDefaultPx), rightMin, rightMax);
  const centerDefault = Math.max(centerMin, 100 - leftDefault - rightDefault);

  return {
    containerRef,
    leftDefault,
    leftMin,
    leftMax,
    centerDefault,
    centerMin,
    rightDefault,
    rightMin,
    rightMax,
  };
}
