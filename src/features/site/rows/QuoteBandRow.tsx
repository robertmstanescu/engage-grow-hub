/**
 * ─────────────────────────────────────────────────────────────────────────
 * QuoteBandRow.tsx — `type: "quote_band"`
 * ─────────────────────────────────────────────────────────────────────────
 * ONE testimonial, set large on a deep plum band with the client name and
 * role underneath. Deliberately not a carousel: a single, confident quote
 * reads as proof; a slider reads as filler. Use TestimonialRow when you
 * genuinely have several to rotate.
 *
 * Pairs naturally with a wave shape — set `shapeTop`/`shapeBottom` on the
 * row layout in the Style tab.
 *
 * DATA CONTRACT
 * {
 *   "eyebrow": "",                     // optional
 *   "quote": "<p>They saved our quarter.</p>",
 *   "name": "Ada Lovelace",
 *   "role": "Head of People · Engine Co.",
 *   "avatar": "…", "avatar_alt": "…"   // optional
 * }
 * ───────────────────────────────────────────────────────────────────────── */

import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/lib/constants/rowDefaults";
import { sanitizeHtml } from "@/services/sanitize";
import { resolveImageAlt } from "@/services/imageAlt";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import { RowEyebrow, RowSection } from "./typography";
import RowNote from "./typography/RowNote";
import type { Alignment, VAlign } from "./PageRows";

const QuoteBandRow = ({
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
  const maxW = l.fullWidth ? "max-w-none" : "max-w-[1080px]";
  const contentAlign = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  const containerPos = align === "center" ? "mx-auto" : align === "right" ? "ml-auto" : "mr-auto";
  const { ref, isVisible } = useScrollReveal();

  if (!c.quote) return null;

  return (
    <RowSection row={row} fullHeight={false}>
      <div ref={ref as any} className={`${maxW} ${containerPos} ${contentAlign} row-container`}>
        {c.eyebrow && (
          <RowEyebrow color={c.color_eyebrow || ""} style={revealStyle(isVisible, -0.5)}>
            {c.eyebrow}
          </RowEyebrow>
        )}
        <blockquote style={revealStyle(isVisible, 0)}>
          <div
            className="font-display font-semibold leading-[1.2] [&_p]:my-0"
            style={{ fontSize: "var(--fs-quote)" }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.quote) }}
          />
          <footer
            className={`mt-8 flex items-center gap-3 ${align === "center" ? "justify-center" : align === "right" ? "justify-end" : ""}`}
          >
            {c.avatar && (
              <img
                src={c.avatar}
                alt={resolveImageAlt(c.avatar_alt, c.name || "Client portrait")}
                loading="lazy"
                className="w-11 h-11 rounded-full object-cover border border-current/20"
              />
            )}
            <div className="text-left">
              {c.name && <div className="font-display text-sm font-semibold">{c.name}</div>}
              {c.role && <div className="font-body text-xs opacity-70">{c.role}</div>}
            </div>
          </footer>
        </blockquote>

        {c.note && <RowNote color={c.color_note}>{c.note}</RowNote>}
      </div>
    </RowSection>
  );
};

export default QuoteBandRow;
