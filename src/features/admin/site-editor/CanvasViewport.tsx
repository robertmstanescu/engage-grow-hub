import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ViewportMode } from "./AdminBuilderToolbar";

/**
 * CanvasViewport — true-fidelity device simulation for the builder.
 *
 * WHY (replaces the previous max-width-only approach):
 *   The old version just narrowed `max-width` on the wrapper. Tailwind's
 *   `md:` / `lg:` variants are evaluated against the REAL window width
 *   though, so even when the canvas was visually 375 px wide, every
 *   widget inside it still rendered its desktop layout. Editors saw
 *   "tablet" and "mobile" buttons that did nothing useful.
 *
 * WHAT WE DO NOW:
 *   • Render the inner stage at the device's NATURAL width (mobile = 390,
 *     tablet = 820, desktop = 100 % of column).
 *   • CSS-`transform: scale(s)` shrinks it to fit the available canvas
 *     column without horizontal scrolling.
 *   • Container queries / element-width-driven layouts now collapse the
 *     way they would on a real phone, because the wrapper IS that wide.
 *
 * KNOWN TRADEOFF:
 *   Tailwind's `md:` / `lg:` media queries STILL fire against the host
 *   window — only iframes get isolated breakpoints. We chose not to use
 *   an iframe because the builder's drag-and-drop / selection context
 *   straddles the canvas; an iframe would sever those bridges. For the
 *   90 % case (widgets that lay out by their own width) this is enough.
 *   If you ever need true media-query isolation, swap in an iframe here
 *   pointing at `/?preview=1`.
 *
 * EPIC 2 / US 2.2 — Canvas Framing & 24 px Safe Zones
 * ---------------------------------------------------
 *   • Outer canvas surface uses a neutral grey (#E5E7EB) so the site
 *     reads as "floating" on a workspace, not colliding with the dark
 *     admin sidebars.
 *   • The site renderer is wrapped in a frame with EXACTLY 24 px of
 *     padding on all sides (i.e. the rendered site's width is
 *     `calc(100% - 48px)`), `shadow-xl`, and a subtle border. This
 *     padding lives on the ADMIN wrapper — it's never applied to the
 *     site itself, so full-width hero rows still bleed edge-to-edge
 *     inside the floating frame.
 *   • The redundant in-canvas Edit/Preview toggle is gone; that lives
 *     in the toolbar now (US 2.1).
 */
interface CanvasViewportProps {
  deviceWidth: number | null;          // 390, 820, or null (= full width)
  viewport: ViewportMode;
  /**
   * Kept for back-compat with existing callers (SiteEditor, PageBuilderShell).
   * The in-canvas toggle has been removed in favour of the toolbar control,
   * so these are accepted but no longer rendered.
   */
  supportsPreview?: boolean;
  canvasMode?: "preview" | "edit";
  setCanvasMode?: (m: "preview" | "edit") => void;
  children: React.ReactNode;
}

// EPIC 2 / US 2.2 — exact safe-zone gutter requested by the spec.
const SAFE_ZONE_PX = 24;

const CanvasViewport = ({
  deviceWidth,
  viewport: _viewport,
  children,
}: CanvasViewportProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);

  // Recompute scale whenever the column resizes or the device toggle
  // changes. ResizeObserver gives us frame-accurate updates without
  // listening to window resize (which misses the resizable-panel drag).
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      setContainerWidth(w);
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!deviceWidth || containerWidth === 0) {
      setScale(1);
      return;
    }
    // Account for the safe-zone gutter (24 px each side) so the device
    // frame doesn't kiss the canvas edges.
    const usable = Math.max(containerWidth - SAFE_ZONE_PX * 2, 200);
    setScale(Math.min(1, usable / deviceWidth));
  }, [deviceWidth, containerWidth]);

  return (
    <section
      ref={containerRef}
      className="h-full overflow-y-auto"
      style={{
        // Neutral workspace grey that reads as a "table" the site sits on.
        // Hex is from the AC; a tiny inline override keeps it identical
        // across light/dark admin themes (the canvas itself is always
        // light because the rendered site provides its own colour scheme).
        backgroundColor: "#E5E7EB",
        padding: SAFE_ZONE_PX,
      }}
    >
      {deviceWidth ? (
        // ──────────────────────────────────────────────────────────────
        // Mobile / Tablet — keep the realistic device frame, but the
        // 24 px gutter comes from the outer section above. Wrapper
        // reserves the SCALED footprint so the canvas scrolls correctly.
        // ──────────────────────────────────────────────────────────────
        <div
          className="mx-auto"
          style={{
            width: deviceWidth * scale,
          }}
        >
          <div
            className="rounded-[28px] border-[10px] overflow-hidden bg-card mx-auto origin-top"
            style={{
              width: deviceWidth,
              borderColor: "hsl(var(--foreground) / 0.85)",
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              // Stronger shadow than before so the device "lifts" off
              // the new lighter canvas background.
              boxShadow:
                "0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 10px 20px -6px rgba(0, 0, 0, 0.18)",
            }}
          >
            {children}
          </div>
        </div>
      ) : (
        // ──────────────────────────────────────────────────────────────
        // Desktop — floating site frame at full available width
        // (calc(100% - 48px) is implicit because the outer section has
        // 24 px padding on each side). NO inner padding: the site itself
        // owns its own bleed for full-width heroes.
        // ──────────────────────────────────────────────────────────────
        <div
          className="rounded-lg border overflow-hidden mx-auto w-full"
          style={{
            backgroundColor: "hsl(var(--card))",
            borderColor: "hsl(var(--border) / 0.5)",
            // shadow-xl in inline form so the colour stays consistent
            // even when the surrounding theme is dark.
            boxShadow:
              "0 20px 25px -5px rgba(0, 0, 0, 0.18), 0 8px 10px -6px rgba(0, 0, 0, 0.10)",
          }}
        >
          {children}
        </div>
      )}
    </section>
  );
};

export default CanvasViewport;
