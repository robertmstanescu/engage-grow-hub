import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Eye, Pencil } from "lucide-react";
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
 */
interface CanvasViewportProps {
  deviceWidth: number | null;          // 390, 820, or null (= full width)
  viewport: ViewportMode;
  supportsPreview: boolean;
  canvasMode: "preview" | "edit";
  setCanvasMode: (m: "preview" | "edit") => void;
  children: React.ReactNode;
}

const CanvasViewport = ({
  deviceWidth,
  viewport,
  supportsPreview,
  canvasMode,
  setCanvasMode,
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
    // 32px gutter so the device frame doesn't kiss the column edges.
    const usable = Math.max(containerWidth - 32, 200);
    setScale(Math.min(1, usable / deviceWidth));
  }, [deviceWidth, containerWidth]);

  return (
    <section
      className="h-full overflow-y-auto"
      style={{ backgroundColor: "hsl(var(--muted) / 0.35)" }}
    >
      <div ref={containerRef} className="mx-auto p-6">
        {/* Preview / Edit toggle */}
        {supportsPreview && (
          <div className="flex items-center justify-between mb-3">
            <span
              className="font-body text-[10px] uppercase tracking-[0.18em]"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              {viewport === "desktop"
                ? "Desktop"
                : viewport === "tablet"
                ? `Tablet · ${deviceWidth}px`
                : `Mobile · ${deviceWidth}px`}
            </span>
            <div
              className="inline-flex items-center rounded-full border p-0.5"
              style={{ borderColor: "hsl(var(--border) / 0.6)", backgroundColor: "hsl(var(--card))" }}
              role="group"
              aria-label="Canvas mode"
            >
              {([
                { key: "preview" as const, label: "Preview", Icon: Eye },
                { key: "edit" as const, label: "Edit", Icon: Pencil },
              ]).map(({ key, label, Icon }) => {
                const active = canvasMode === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCanvasMode(key)}
                    aria-pressed={active}
                    className="flex items-center gap-1.5 font-body text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full transition-colors"
                    style={{
                      backgroundColor: active ? "hsl(var(--accent))" : "transparent",
                      color: active ? "hsl(var(--accent-foreground))" : "hsl(var(--muted-foreground))",
                    }}
                  >
                    <Icon size={12} /> {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Device-sized stage. */}
        {deviceWidth ? (
          // Wrapper reserves the SCALED footprint so the canvas scrolls
          // correctly. Inner stage renders at full device width and scales.
          <div
            className="mx-auto"
            style={{
              width: deviceWidth * scale,
              // Height auto-flows from content × scale; we let the inner
              // stage decide its own height and just transform-scale it.
            }}
          >
            <div
              className="rounded-[28px] border-[10px] shadow-2xl overflow-hidden bg-card mx-auto origin-top"
              style={{
                width: deviceWidth,
                borderColor: "hsl(var(--foreground) / 0.85)",
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              {children}
            </div>
          </div>
        ) : (
          <div
            className="rounded-lg border shadow-sm overflow-hidden mx-auto"
            style={{
              maxWidth: "64rem",
              backgroundColor: "hsl(var(--card))",
              borderColor: "hsl(var(--border) / 0.5)",
              padding: canvasMode === "preview" && supportsPreview ? 0 : "1.25rem",
            }}
          >
            {children}
          </div>
        )}
      </div>
    </section>
  );
};

export default CanvasViewport;
