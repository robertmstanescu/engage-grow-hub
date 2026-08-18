/**
 * ─────────────────────────────────────────────────────────────────────────
 * CtaBandRow.tsx — `type: "cta_band"`
 * ─────────────────────────────────────────────────────────────────────────
 * A persistent closing CTA so the page never dead-ends. One ink pill
 * (primary) plus an optional arrow text link (tertiary) — the button
 * vocabulary stays at two, exactly as the design system intends.
 *
 * DATA CONTRACT
 * {
 *   "eyebrow": "",                                   // optional
 *   "title_lines": ["<p>Book a free consultation</p>"],
 *   "body": "<p>…</p>",                              // optional
 *   "button_text": "Book a free consultation",
 *   "button_url": "/contact/",
 *   "link_text": "See how we work",                  // optional
 *   "link_url": "/services/"
 * }
 * ───────────────────────────────────────────────────────────────────────── */

import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/lib/constants/rowDefaults";
import { sanitizeHtml } from "@/services/sanitize";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import { RowEyebrow, RowTitle, RowBody, RowSection } from "./typography";
import type { Alignment, VAlign } from "./PageRows";

const CtaBandRow = ({
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
  const titleLines: string[] = (c.title_lines || []).map((li: any) =>
    typeof li === "string" ? (li.startsWith("<") ? li : `<p>${li}</p>`) : `<p>${li}</p>`,
  );
  const maxW = l.fullWidth ? "max-w-none" : "max-w-[1280px]";
  const contentAlign = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  const containerPos = align === "center" ? "mx-auto" : align === "right" ? "ml-auto" : "mr-auto";
  const actionsAlign =
    align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start";
  const { ref, isVisible } = useScrollReveal();

  const buttonText = c.button_text || "";
  const linkText = c.link_text || "";
  if (titleLines.length === 0 && !buttonText) return null;

  return (
    <RowSection row={row} fullHeight={false}>
      <div ref={ref as any} className={`${maxW} ${containerPos} ${contentAlign} row-container`}>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
          <div className="min-w-0">
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
            {c.body && <RowBody html={sanitizeHtml(c.body)} className="measure" style={revealStyle(isVisible, 0.3)} />}
          </div>

          <div className={`flex flex-wrap items-center gap-5 ${actionsAlign} shrink-0`} style={revealStyle(isVisible, 0.4)}>
            {buttonText && (
              <a href={c.button_url || "/#contact"} className="btn-ink">
                {buttonText}
              </a>
            )}
            {linkText && (
              <a href={c.link_url || "#"} className="link-arrow">
                {linkText}
                <span aria-hidden className="link-arrow-glyph">→</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </RowSection>
  );
};

export default CtaBandRow;
