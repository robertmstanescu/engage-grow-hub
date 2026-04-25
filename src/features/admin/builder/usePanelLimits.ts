import { useEffect, useRef, useState } from "react";

/**
 * Debug Story 1.1 + 1.2 — "Unbreakable" panel resizing.
 *
 * `react-resizable-panels` only accepts percentage sizes, but our QA contract
 * is expressed in pixels (Left max 300px, Right max 400px, Center min 300px).
 *
 * This hook observes the wrapping PanelGroup container and converts the pixel
 * caps into live percentages so the limits hold no matter how the user resizes
 * the browser. It also exposes:
 *   • `reset()` defaults — for the double-click handler on the resize divider.
 *   • `stack` — true when the container is too narrow to hold all three panes
 *     at their minimum widths (Left + Center + Right). When this fires the
 *     shell must render a vertical stacked/scroll fallback instead of feeding
 *     impossible percentage constraints to react-resizable-panels (which would
 *     either over-constrain the layout or throw).
 */
export interface PanelLimits {
  containerRef: React.RefObject<HTMLDivElement>;
  /** True when the container is below the minimum 3-pane budget. */
  stack: boolean;
  /** Measured container width in CSS pixels (0 until first measurement). */
  containerWidth: number;
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
  // Inspector / Element Settings — bumped from 400/240/340 so the form
  // controls (toolbar, swatches, font selectors) are no longer clipped
  // on standard 13–16" screens. The right pane can still be resized
  // smaller via the splitter; these are caps + defaults only.
  rightMaxPx: 600,
  rightMinPx: 320,
  centerMinPx: 300,
  leftDefaultPx: 260,
  rightDefaultPx: 480,
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

  // Minimum pixel budget required to render all three panes side-by-side.
  // Below this we fall back to a vertical stacked layout (Debug Story 1.2).
  const stackThreshold = opts.leftMinPx + opts.centerMinPx + opts.rightMinPx;

  // Until we measure, assume a comfortable desktop width so the first paint
  // doesn't flash a stacked layout.
  const safeWidth = width > 0 ? width : 1200;
  const stack = width > 0 && width < stackThreshold;

  const pct = (px: number) => (px / safeWidth) * 100;
  const clamp = (n: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, n));

  // Hard ceilings driven by pixel caps.
  const leftMaxRaw = pct(opts.leftMaxPx);
  const rightMaxRaw = pct(opts.rightMaxPx);
  const leftMax = clamp(leftMaxRaw, 5, 45);
  const rightMax = clamp(rightMaxRaw, 5, 50);

  // Floors. These must remain mutually satisfiable —
  // leftMin + rightMin + centerMin must NEVER exceed 100, or
  // react-resizable-panels will warn and the layout will jam.
  // We compute floors and then deflate proportionally if they overflow.
  let leftMin = clamp(pct(opts.leftMinPx), 5, leftMax);
  let rightMin = clamp(pct(opts.rightMinPx), 5, rightMax);
  let centerMin = Math.max(15, pct(opts.centerMinPx));
  const totalMin = leftMin + centerMin + rightMin;
  if (totalMin > 95) {
    // Deflate proportionally, keeping a 5% safety margin so the user can
    // still nudge the dividers. (This branch is only hit during the brief
    // window before we render the stacked fallback in Debug Story 1.2,
    // but we keep the math safe regardless.)
    const scale = 95 / totalMin;
    leftMin *= scale;
    rightMin *= scale;
    centerMin *= scale;
  }

  // Defaults — percentage equivalent of the pixel default, clamped into
  // bounds. Center fills whatever's left so the row always sums to 100.
  const leftDefault = clamp(pct(opts.leftDefaultPx), leftMin, leftMax);
  const rightDefault = clamp(pct(opts.rightDefaultPx), rightMin, rightMax);
  const centerDefault = Math.max(centerMin, 100 - leftDefault - rightDefault);

  return {
    containerRef,
    stack,
    containerWidth: width,
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
