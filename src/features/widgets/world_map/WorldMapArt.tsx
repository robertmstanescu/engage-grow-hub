import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MAP_BASE_PATHS, MAP_COUNTRIES, MAP_DOTS } from "./mapData";
import { statusLabel, type MapStatus } from "./resolve";
import type { WorldMapContent } from "./schema";
import { MAP_H, MAP_W, MAX_ZOOM, WHOLE_WORLD, ZOOM_STEP, panBy, viewBoxOf, zoomAt, type MapView } from "./zoom";

/**
 * The map itself, code-split out of the public bundle (the path data is
 * ~120KB). Countries shade in with a staggered draw-on animation that starts
 * when the map is in full view; the
 * `play` class is re-applied by the Replay button. Reduced motion shows
 * the end state instantly (CSS).
 *
 * Zoom (owner's request, 10 Nov 2026): plus, minus and reset buttons,
 * pinch on a touch screen, Ctrl/Cmd + wheel (a trackpad pinch), a
 * double-click, and drag to move once zoomed in. A plain wheel still
 * scrolls the page. The maths lives in `zoom.ts`.
 */
const WorldMapArt = ({ groups, content }: { groups: Map<string, MapStatus>; content: WorldMapContent }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(true);
  /* The draw-on waits until the map is in full view (owner, 10 Nov 2026). */
  const [started, setStarted] = useState(false);
  const [tip, setTip] = useState<{ x: number; y: number; name: string; status: string } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<MapView>(WHOLE_WORLD);
  const [dragging, setDragging] = useState(false);
  /* Live pointers on the map (one = drag, two = pinch) and the last
     reading of each, kept in a ref so moves do not re-render. */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const zoomed = view.k > 1;
  const dots = useMemo(() => MAP_DOTS.filter((d) => groups.has(d.name)), [groups]);

  const shaded = useMemo(
    () => MAP_COUNTRIES.filter((c) => groups.has(c.name)),
    [groups],
  );

  const showTip = useCallback((name: string, status: MapStatus, el: SVGGraphicsElement) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const w = wrap.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    // Zoomed in, a country can run past the edge: keep the label in the box.
    setTip({
      x: Math.min(w.width, Math.max(0, b.left - w.left + b.width / 2)),
      y: Math.max(0, b.top - w.top),
      name,
      status: statusLabel(status, content),
    });
  }, [content]);

  /** Where a screen point sits across the map box, 0 to 1. */
  const fractionOf = (clientX: number, clientY: number): { fx: number; fy: number } => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r || !r.width || !r.height) return { fx: 0.5, fy: 0.5 };
    return { fx: (clientX - r.left) / r.width, fy: (clientY - r.top) / r.height };
  };

  const zoomBy = (factor: number, fx = 0.5, fy = 0.5) => {
    setTip(null);
    setView((v) => zoomAt(v, factor, fx, fy));
  };

  useEffect(() => {
    const svg = svgRef.current;
    // No observer (old browser, tests): show the map at once, never leave it blank.
    if (!svg || typeof IntersectionObserver === "undefined") { setStarted(true); return; }
    const io = new IntersectionObserver(
      (entries) => {
        // 0.9, not 1: a pixel of rounding must not keep the map waiting.
        // On a short screen the map can be taller than the window and
        // would never be 90% visible: filling most of the window counts.
        const seen = (en: IntersectionObserverEntry) =>
          en.intersectionRatio >= 0.9 ||
          en.intersectionRect.height >= (en.rootBounds?.height ?? window.innerHeight) * 0.7;
        if (entries.some(seen)) { setStarted(true); io.disconnect(); }
      },
      { threshold: [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] },
    );
    io.observe(svg);
    return () => io.disconnect();
  }, []);

  /* Ctrl/Cmd + wheel zooms (this is also what a trackpad pinch sends).
     React's wheel listener is passive, so it is attached by hand to be
     able to stop the browser's own page zoom. */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return; // a plain wheel scrolls the page
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const factor = Math.exp(-e.deltaY * 0.01);
      setTip(null);
      setView((v) => zoomAt(v, factor, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const r = svgRef.current?.getBoundingClientRect();
    if (!r || !r.width || !r.height) return;
    const all = pointers.current;
    if (all.size === 2) {
      // Pinch: zoom by the change in distance, about the midpoint.
      const other = [...all.entries()].find(([id]) => id !== e.pointerId)?.[1];
      if (other) {
        const before = Math.hypot(prev.x - other.x, prev.y - other.y);
        const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
        if (before > 0 && after > 0) {
          const { fx, fy } = fractionOf((e.clientX + other.x) / 2, (e.clientY + other.y) / 2);
          zoomBy(after / before, fx, fy);
        }
      }
    } else if (all.size === 1 && zoomed) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      if (!dragging && Math.hypot(dx, dy) < 3) return; // a click, not a drag
      if (!dragging) {
        setDragging(true);
        setTip(null);
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
      }
      setView((v) => panBy(v, dx / r.width, dy / r.height));
    }
    all.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };

  const onPointerEnd = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) setDragging(false);
  };

  const replay = () => {
    setStarted(true);
    setPlaying(false);
    // Let the class come off before re-adding so the animation restarts.
    requestAnimationFrame(() => requestAnimationFrame(() => setPlaying(true)));
  };

  return (
    <>
      <div ref={wrapRef} className="relative tmc-map-box">
        <svg
          ref={svgRef}
          className={`tmc-map${!started ? " wait" : playing ? " play" : ""}${zoomed ? " is-zoomed" : ""}${dragging ? " is-dragging" : ""}`}
          role="img"
          aria-label="World map of the countries worked across"
          viewBox={viewBoxOf(view)}
          /* The box keeps the whole map's shape at every zoom. Zoomed
             in, one finger moves the map; at rest it scrolls the page. */
          style={{ display: "block", width: "100%", height: "auto", aspectRatio: `${MAP_W} / ${MAP_H}`, touchAction: zoomed ? "none" : "pan-y" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onPointerLeave={(e) => { if (!dragging) onPointerEnd(e); }}
          onDoubleClick={(e) => { const { fx, fy } = fractionOf(e.clientX, e.clientY); zoomBy(ZOOM_STEP, fx, fy); }}
        >
          <g>
            {MAP_BASE_PATHS.map((d, i) => (
              <path key={i} className="c" d={d} />
            ))}
            {shaded.map((c) => {
              const status = groups.get(c.name)!;
              /* Every shaded place names itself on hover and focus,
                 a market-only one (Romania) included: owner, 10 Nov 2026. */
              const live = true;
              return (
                <path
                  key={c.name}
                  className={`c wm-${status}${live ? " wm-live" : ""}`}
                  d={c.d}
                  style={{ ["--d" as string]: `${c.delay}s` }}
                  {...(live
                    ? {
                        tabIndex: 0,
                        role: "button",
                        "aria-label": `${c.name}: ${statusLabel(status, content)}`,
                        onMouseEnter: (e: React.MouseEvent<SVGPathElement>) => { if (!dragging) showTip(c.name, status, e.currentTarget); },
                        onMouseLeave: () => setTip(null),
                        onFocus: (e: React.FocusEvent<SVGPathElement>) => showTip(c.name, status, e.currentTarget),
                        onBlur: () => setTip(null),
                      }
                    : { "aria-hidden": true })}
                />
              );
            })}
            {/* Places too small for a shape (Hong Kong, Singapore). */}
            {dots.map((d) => {
              const status = groups.get(d.name)!;
              const live = true;
              return (
                <circle
                  key={d.name}
                  className={`c wm-${status}${live ? " wm-live" : ""}`}
                  cx={d.cx}
                  cy={d.cy}
                  r={d.r}
                  style={{ ["--d" as string]: `${d.delay}s` }}
                  {...(live
                    ? {
                        tabIndex: 0,
                        role: "button",
                        "aria-label": `${d.name}: ${statusLabel(status, content)}`,
                        onMouseEnter: (e: React.MouseEvent<SVGCircleElement>) => { if (!dragging) showTip(d.name, status, e.currentTarget); },
                        onMouseLeave: () => setTip(null),
                        onFocus: (e: React.FocusEvent<SVGCircleElement>) => showTip(d.name, status, e.currentTarget),
                        onBlur: () => setTip(null),
                      }
                    : { "aria-hidden": true })}
                />
              );
            })}
          </g>
        </svg>
        <div
          role="status"
          aria-live="polite"
          className="tmc-tip"
          style={{
            position: "absolute",
            left: tip?.x ?? 0,
            top: tip?.y ?? 0,
            opacity: tip ? 1 : 0,
          }}
        >
          <div className="tmc-tip-name">{tip?.name}</div>
          <div className="tmc-tip-status">{tip?.status}</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <span className="tmc-legend"><span aria-hidden className="tmc-legend-swatch" style={{ background: "hsl(var(--map-worked))" }} />{content.legend_worked || "Internal comms"}</span>
          <span className="tmc-legend"><span aria-hidden className="tmc-legend-swatch" style={{ background: "hsl(var(--map-hr))" }} />{content.legend_hr || "Internal comms and HR"}</span>
          <span className="tmc-legend"><span aria-hidden className="tmc-legend-swatch" style={{ background: "hsl(var(--map-main))" }} />{content.legend_main || "Main markets today"}</span>
          {content.legend_note && <span className="tmc-legend">{content.legend_note}</span>}
          {/* The map art's licence asks for this credit; keep it visible. */}
          <a className="tmc-legend tmc-credit" href="https://www.amcharts.com/svg-maps/" target="_blank" rel="noopener noreferrer">Map: amCharts</a>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="tmc-zoom" role="group" aria-label="Zoom the map">
            <button type="button" className="tmc-zoom-btn" onClick={() => zoomBy(1 / ZOOM_STEP)} disabled={!zoomed} aria-label="Zoom out">
              <span aria-hidden>&minus;</span>
            </button>
            <button type="button" className="tmc-zoom-btn" onClick={() => zoomBy(ZOOM_STEP)} disabled={view.k >= MAX_ZOOM} aria-label="Zoom in">
              <span aria-hidden>+</span>
            </button>
          </div>
          {zoomed && (
            <button type="button" className="tmc-replay" onClick={() => { setTip(null); setView(WHOLE_WORLD); }}>
              Whole map
            </button>
          )}
          <button type="button" onClick={replay} className="tmc-replay">
            <span aria-hidden>&#8635;</span>Replay the map
          </button>
        </div>
      </div>
    </>
  );
};

export default WorldMapArt;
