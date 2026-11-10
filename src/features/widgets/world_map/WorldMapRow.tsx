import { lazy, Suspense, useMemo } from "react";
import type { PageRow } from "@/types/rows";
import { getRowColumns } from "@/lib/constants/rowDefaults";
import type { Alignment, VAlign } from "@/features/site/rows/PageRows";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import { RowEyebrow, RowTitle, RowSubtitle, RowSection } from "@/features/site/rows/typography";
import { worldMapSchema, type WorldMapContent } from "./schema";
import { resolveMapGroups, mapCounters } from "./resolve";

// Code-split: the map art carries ~120KB of SVG path data.
const WorldMapArt = lazy(() => import("./WorldMapArt"));

const WorldMapRow = ({ row, align = "left", vAlign = "middle" }: { row: PageRow; rowIndex?: number; align?: Alignment; vAlign?: VAlign }) => {
  const { contents, isMultiCol } = getRowColumns(row);
  const c: WorldMapContent = worldMapSchema.parse(contents[0] ?? {});
  const { ref, isVisible } = useScrollReveal();

  // Defaults hold no countries — the owner fills the three lists (the
  // section-library starter pre-fills them from the artboard shading).
  const groups = useMemo(() => resolveMapGroups(c), [c]);
  const counters = useMemo(() => mapCounters(groups), [groups]);

  return (
    <RowSection row={row} vAlign={vAlign} innerRef={(el) => { (ref as { current: HTMLElement | null }).current = el; }} fullHeight={false}>
      <div
        className="max-w-[1280px] mx-auto glass rounded-[24px] p-7 md:p-14 flex flex-col gap-7"
        style={revealStyle(isVisible, 0)}
      >
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div className="flex min-w-0 max-w-[640px] flex-1 flex-col gap-4" style={{ flexBasis: 520 }}>
            <RowEyebrow>{c.eyebrow}</RowEyebrow>
            <RowTitle>{(c.title_lines || []).join(" ")}</RowTitle>
            <RowSubtitle>{c.lede}</RowSubtitle>
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
          <Suspense fallback={<div style={{ aspectRatio: "1200 / 560" }} aria-hidden />}>
            <WorldMapArt groups={groups} content={c} />
          </Suspense>
        )}
      </div>
    </RowSection>
  );
};

export default WorldMapRow;
