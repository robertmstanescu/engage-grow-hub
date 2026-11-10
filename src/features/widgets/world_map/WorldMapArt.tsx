import { useCallback, useMemo, useRef, useState } from "react";
import { MAP_BASE_PATHS, MAP_COUNTRIES } from "./mapData";
import { statusLabel, type MapStatus } from "./resolve";
import type { WorldMapContent } from "./schema";

/**
 * The map itself, code-split out of the public bundle (the path data is
 * ~120KB). Countries shade in with a staggered draw-on animation; the
 * `play` class is re-applied by the Replay button. Reduced motion shows
 * the end state instantly (CSS).
 */
const WorldMapArt = ({ groups, content }: { groups: Map<string, MapStatus>; content: WorldMapContent }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(true);
  const [tip, setTip] = useState<{ x: number; y: number; name: string; status: string } | null>(null);

  const shaded = useMemo(
    () => MAP_COUNTRIES.filter((c) => groups.has(c.name)),
    [groups],
  );

  const showTip = useCallback((name: string, status: MapStatus, el: SVGPathElement) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const w = wrap.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    setTip({
      x: b.left - w.left + b.width / 2,
      y: b.top - w.top,
      name,
      status: statusLabel(status, content),
    });
  }, [content]);

  const replay = () => {
    setPlaying(false);
    // Let the class come off before re-adding so the animation restarts.
    requestAnimationFrame(() => requestAnimationFrame(() => setPlaying(true)));
  };

  return (
    <>
      <div ref={wrapRef} className="relative">
        <svg
          className={`tmc-map${playing ? " play" : ""}`}
          role="img"
          aria-label="World map of the countries worked across"
          viewBox="0 0 1200 560"
          style={{ display: "block", width: "100%", height: "auto" }}
        >
          <g>
            {MAP_BASE_PATHS.map((d, i) => (
              <path key={i} className="c" d={d} />
            ))}
            {shaded.map((c) => {
              const status = groups.get(c.name)!;
              return (
                <path
                  key={c.name}
                  className={`c wm-${status}`}
                  d={c.d}
                  style={{ ["--d" as string]: `${c.delay}s` }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${c.name}: ${statusLabel(status, content)}`}
                  onMouseEnter={(e) => showTip(c.name, status, e.currentTarget)}
                  onMouseLeave={() => setTip(null)}
                  onFocus={(e) => showTip(c.name, status, e.currentTarget)}
                  onBlur={() => setTip(null)}
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
          <span className="tmc-legend"><span aria-hidden className="tmc-legend-swatch" style={{ background: "hsl(var(--accent))" }} />{content.legend_worked || "Internal comms"}</span>
          <span className="tmc-legend"><span aria-hidden className="tmc-legend-swatch" style={{ background: "hsl(var(--primary))" }} />{content.legend_hr || "Internal comms and HR"}</span>
          <span className="tmc-legend"><span aria-hidden className="tmc-legend-swatch" style={{ background: "hsl(var(--map-main))" }} />{content.legend_main || "Main markets today"}</span>
          {content.legend_note && <span className="tmc-legend">{content.legend_note}</span>}
        </div>
        <button type="button" onClick={replay} className="tmc-replay">
          <span aria-hidden>&#8635;</span>Replay the map
        </button>
      </div>
    </>
  );
};

export default WorldMapArt;
