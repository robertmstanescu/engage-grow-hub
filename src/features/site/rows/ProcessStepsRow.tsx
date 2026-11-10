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
  const titleLines: string[] = (c.title_lines || []).map((li: unknown) =>
    typeof li === "string" ? (li.startsWith("<") ? li : `<p>${li}</p>`) : `<p>${li}</p>`,
  );
  const maxW = l.fullWidth ? "max-w-none" : "max-w-[1280px]";
  const contentAlign = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  const containerPos = align === "center" ? "mx-auto" : align === "right" ? "ml-auto" : "mr-auto";
  const { ref, isVisible } = useScrollReveal();

  if (steps.length === 0) return null;

  /* Redesign looks, all stored on the row and set in its editor:
       step_style "cards"   glass step cards instead of ruled columns
       subtitle_as_title    the subtitle is the section's headline
       last_step_as_note    the last step hangs under the cards as a
                            handwritten aside (needs two steps or more) */
  const asCards = c.step_style === "cards";
  const subtitleAsTitle = !!c.subtitle_as_title && !!c.subtitle && titleLines.length === 0;
  const noteStep = c.last_step_as_note && steps.length > 1 ? steps[steps.length - 1] : null;
  const shown = noteStep ? steps.slice(0, -1) : steps;
  const stripTags = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const cols = shown.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : shown.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3";
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
        {subtitleAsTitle && (
          <RowTitle style={{ ...revealStyle(isVisible, 0), maxWidth: "22ch" }}>{c.subtitle}</RowTitle>
        )}
        {c.subtitle && !subtitleAsTitle && (
          <RowSubtitle handwritten={!!c.subtitle_handwritten} color={c.subtitle_color || ""} style={revealStyle(isVisible, 0.3)}>
            {c.subtitle}
          </RowSubtitle>
        )}
        {c.body && <RowBody html={sanitizeHtml(c.body)} className="measure" style={revealStyle(isVisible, 0.35)} />}

        {/* align-cards: the number, title and text of every step in a line sit on
            shared rows, so a two-line title moves its neighbours' text down too. */}
        <ol className={`mt-10 grid grid-cols-1 ${cols} ${asCards ? "gap-4 lg:gap-5" : "gap-8 lg:gap-10"} text-left align-cards`}>
          {shown.map((step, i) => (
            <li
              key={i}
              className={`align-card ${asCards ? "surface-card flex flex-col gap-2" : "border-t row-border pt-5 flex flex-col gap-2"}`}
              style={{ ...revealStyle(isVisible, 0.4 + i * 0.08), ...(asCards ? { padding: "clamp(20px, 2vw, 28px)" } : {}), ["--slots" as string]: 3, ["--slot-gap" as string]: "8px", alignContent: "start" }}
            >
              {/* Understated number: a quiet counter, not a badge. */}
              <span
                className={`font-display font-bold tracking-[0.08em] ${asCards ? "" : "row-fg-muted"}`}
                style={{ fontSize: 13, ...(asCards ? { color: "hsl(var(--heading))" } : {}) }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              {step.title ? (
                <h3 className="font-display font-bold leading-tight row-fg" style={{ fontSize: "var(--fs-step-title)", ...(asCards ? { color: "hsl(var(--heading))" } : {}) }}>
                  {step.title}
                </h3>
              ) : (
                <span className="align-empty" aria-hidden />
              )}
              {step.description ? (
                <div
                  className="rich-text font-body row-fg-muted [&_p]:my-1"
                  style={{ fontSize: "var(--fs-card-body)", lineHeight: "var(--lh-card-body)" }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(step.description) }}
                />
              ) : (
                <span className="align-empty" aria-hidden />
              )}
            </li>
          ))}
        </ol>

        {noteStep && (
          <p
            className="font-hand flex items-start gap-3 text-left"
            style={{ ...revealStyle(isVisible, 0.8), marginTop: 28, fontSize: 20, lineHeight: 1.4, color: "hsl(var(--link))", transform: "rotate(-1deg)", transformOrigin: "left center" }}
          >
            <svg aria-hidden width="34" height="22" viewBox="0 0 34 22" fill="none" className="flex-none mt-1">
              <path d="M1 20C8 9 18 5 31 5M31 5l-7-4M31 5l-5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{[noteStep.title, stripTags(noteStep.description || "")].filter(Boolean).join(" ")}</span>
          </p>
        )}

        {c.note && <RowNote color={c.color_note} handwritten={!!c.note_handwritten}>{c.note}</RowNote>}
    </>
  );

  return (
    <RowSection row={row} fullHeight={false}>
      {coverImage ? (
        <div className={`${maxW} w-full mx-auto`}>
          <RowCoverCard row={row}>
            <div ref={ref} className={contentAlign}>{innerContent}</div>
          </RowCoverCard>
        </div>
      ) : (
        <div ref={ref} className={`${maxW} ${containerPos} ${contentAlign} row-container`}>
          {innerContent}
        </div>
      )}
    </RowSection>
  );
};

export default ProcessStepsRow;
