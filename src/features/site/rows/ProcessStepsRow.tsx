/**
 * ─────────────────────────────────────────────────────────────────────────
 * ProcessStepsRow.tsx — `type: "process_steps"`
 * ─────────────────────────────────────────────────────────────────────────
 * A "How we work" strip: three or four steps with understated numbers so
 * a buyer can picture the engagement before they ever get on a call.
 *
 * DATA CONTRACT
 * {
 *   "eyebrow": "How we work",
 *   "title_lines": ["<p>Three steps, no mystery</p>"],
 *   "steps": [{ "title": "Listen", "description": "<p>…</p>" }]
 * }
 * ───────────────────────────────────────────────────────────────────────── */

import type { PageRow, ProcessStep } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/lib/constants/rowDefaults";
import { sanitizeHtml } from "@/services/sanitize";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import { RowEyebrow, RowTitle, RowSubtitle, RowBody, RowSection } from "./typography";
import RowNote from "./typography/RowNote";
import type { Alignment, VAlign } from "./PageRows";
import RowCoverCard from "@/features/site/RowCoverCard";

const ProcessStepsRow = ({
  row,
  align = "left",
}: {
  row: PageRow;
  rowIndex?: number;
  align?: Alignment;
  vAlign?: VAlign;
}) => {
  const c = row.content || {};
  const l = { ...DEFAULT_ROW_LAYOUT, ...row.layout };
  const steps: ProcessStep[] = Array.isArray(c.steps) ? c.steps : [];
  const titleLines: string[] = (c.title_lines || []).map((li: any) =>
    typeof li === "string" ? (li.startsWith("<") ? li : `<p>${li}</p>`) : `<p>${li}</p>`,
  );
  const maxW = l.fullWidth ? "max-w-none" : "max-w-[1280px]";
  const contentAlign = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  const containerPos = align === "center" ? "mx-auto" : align === "right" ? "ml-auto" : "mr-auto";
  const { ref, isVisible } = useScrollReveal();

  if (steps.length === 0) return null;

  const cols = steps.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3";
  const coverImage = c.cover_image?.trim() || undefined;

  const innerContent = (
    <>
        {c.eyebrow && (
          <RowEyebrow color={c.color_eyebrow || ""} style={revealStyle(isVisible, -0.5)}>
            {c.eyebrow}
          </RowEyebrow>
        )}
        {titleLines.length > 0 && (
          <RowTitle icon={c.icon} style={revealStyle(isVisible, 0)}>
            {titleLines.map((line, i) => (
              <span key={i} className="block" dangerouslySetInnerHTML={{ __html: sanitizeHtml(line) }} />
            ))}
          </RowTitle>
        )}
        {c.subtitle && (
          <RowSubtitle color={c.subtitle_color || ""} style={revealStyle(isVisible, 0.3)}>
            {c.subtitle}
          </RowSubtitle>
        )}
        {c.body && <RowBody html={sanitizeHtml(c.body)} className="measure" style={revealStyle(isVisible, 0.35)} />}

        <ol className={`mt-10 grid grid-cols-1 ${cols} gap-8 lg:gap-10 text-left`}>
          {steps.map((step, i) => (
            <li
              key={i}
              className="border-t row-border pt-5 flex flex-col gap-2"
              style={revealStyle(isVisible, 0.4 + i * 0.08)}
            >
              {/* Understated number — a quiet counter, not a badge. */}
              <span className="font-display text-sm font-semibold tracking-[0.18em] row-fg-muted">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-display font-bold leading-tight row-fg" style={{ fontSize: "var(--fs-step-title)" }}>
                {step.title}
              </h3>
              {step.description && (
                <div
                  className="font-body text-sm leading-relaxed row-fg-muted measure [&_p]:my-1"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(step.description) }}
                />
              )}
            </li>
          ))}
        </ol>

        {c.note && <RowNote color={c.color_note}>{c.note}</RowNote>}
    </>
  );

  return (
    <RowSection row={row} fullHeight={false}>
      {coverImage ? (
        <div className={`${maxW} w-full mx-auto`}>
          <RowCoverCard row={row}>
            <div ref={ref as any} className={contentAlign}>{innerContent}</div>
          </RowCoverCard>
        </div>
      ) : (
        <div ref={ref as any} className={`${maxW} ${containerPos} ${contentAlign} row-container`}>
          {innerContent}
        </div>
      )}
    </RowSection>
  );
};

export default ProcessStepsRow;
