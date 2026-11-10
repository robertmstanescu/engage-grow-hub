import { parseContent } from "@/lib/parseContent";
import { lazy, Suspense, useMemo } from "react";
import type { PageRow } from "@/types/rows";
import { getRowColumns } from "@/lib/constants/rowDefaults";
import type { Alignment, VAlign } from "@/features/site/rows/PageRows";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import { RowEyebrow, RowTitle, RowSection } from "@/features/site/rows/typography";
import { worldMapSchema, type WorldMapContent } from "./schema";
import { resolveMapGroups, mapCounters } from "./resolve";
import { MAP_H, MAP_W } from "./zoom";

// Code-split: the map art carries ~120KB of SVG path data.
const WorldMapArt = lazy(() => import("./WorldMapArt"));

const WorldMapRow = ({ row, align = "left", vAlign = "middle" }: { row: PageRow; rowIndex?: number; align?: Alignment; vAlign?: VAlign }) => {
  const { contents, isMultiCol } = getRowColumns(row);
  const c: WorldMapContent = parseContent(worldMapSchema, contents[0]);
  const { ref, isVisible } = useScrollReveal();

  // Defaults hold no countries — the owner fills the three lists (the
  // section-library starter pre-fills them from the artboard shading).
  const groups = useMemo(() => resolveMapGroups(c), [c]);
  const counters = useMemo(() => mapCounters(c), [c])

  return (
    <RowSection row={row} vAlign={vAlign} innerRef={(el) => { (ref as { current: HTMLElement | null }).current = el; }} fullHeight={false}>
      {/* The card fills the 1280px column (artboard Main); the row
          container supplies the page gutter. */}
      <div className="row-container max-w-[1280px] w-full">
      <div
        className="w-full glass rounded-[24px] p-7 md:p-14 flex flex-col gap-7"
        style={revealStyle(isVisible, 0)}
      >
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div className="flex min-w-0 max-w-[640px] flex-1 flex-col gap-4" style={{ flexBasis: 520 }}>
            <RowEyebrow className="!mb-0">{c.eyebrow}</RowEyebrow>
            {/* The first line prints in the heading colour, the rest in the
                lighter violet, as the artboard draws it. */}
            <RowTitle className="!mb-0">
              {(c.title_lines || []).map((line, i) => (
                <span key={i} style={i > 0 ? { color: "hsl(var(--link))" } : undefined}>{i > 0 ? " " : ""}{line}</span>
              ))}
            </RowTitle>
            <p className="font-body" style={{ margin: 0, fontSize: "var(--fs-subtitle)", lineHeight: 1.7, color: "hsl(var(--body))" }}>{c.lede}</p>
          </div>
          <div className="flex items-end gap-9" aria-live="polite">
            <div className="flex flex-col gap-1">
              <span className="font-display font-extrabold leading-[0.9]" style={{ color: "hsl(var(--gold-text))", fontSize: "clamp(48px, 5vw, 72px)" }}>
                {counters.comms}
              </span>
              <span className="text-[13px]" style={{ color: "hsl(var(--vows-card-body))" }}>{c.worked_label}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-display font-extrabold leading-[0.9]" style={{ color: "hsl(var(--primary))", fontSize: "clamp(48px, 5vw, 72px)" }}>
                {counters.hr}
              </span>
              <span className="text-[13px]" style={{ color: "hsl(var(--vows-card-body))" }}>{c.hr_label}</span>
            </div>
          </div>
        </div>
        {!isMultiCol && (
          <Suspense fallback={<div className="tmc-map-box" style={{ aspectRatio: `${MAP_W} / ${MAP_H}` }} aria-hidden />}>
            <WorldMapArt groups={groups} content={c} />
          </Suspense>
        )}
      </div>
      </div>
    </RowSection>
  );
};

export default WorldMapRow;
