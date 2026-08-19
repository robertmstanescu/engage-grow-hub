/**
 * ─────────────────────────────────────────────────────────────────────────
 * ProofBandRow.tsx — `type: "proof_band"`
 * ─────────────────────────────────────────────────────────────────────────
 * The single biggest credibility lift on a consulting site: a compact
 * band of three to four outcome stats (or client logos) that sits right
 * under the hero.
 *
 * DATA CONTRACT
 * {
 *   "eyebrow": "Proof",                     // optional
 *   "title_lines": ["<p>Outcomes</p>"],     // optional
 *   "subtitle": "", "body": "",             // optional
 *   "items": [{ "value": "38%", "label": "lift in message recall" }]
 * }
 *
 * Items may carry a `logo` instead of a `value` — the logo renders in
 * place of the number so the same row doubles as a client logo strip.
 * ───────────────────────────────────────────────────────────────────────── */

import type { PageRow, ProofItem } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/lib/constants/rowDefaults";
import { sanitizeHtml } from "@/services/sanitize";
import { resolveImageAlt } from "@/services/imageAlt";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import { RowEyebrow, RowTitle, RowSubtitle, RowBody, RowSection } from "./typography";
import RowNote from "./typography/RowNote";
import type { Alignment, VAlign } from "./PageRows";

const ProofBandRow = ({
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
  const items: ProofItem[] = Array.isArray(c.items) ? c.items : [];
  const titleLines: string[] = (c.title_lines || []).map((li: any) =>
    typeof li === "string" ? (li.startsWith("<") ? li : `<p>${li}</p>`) : `<p>${li}</p>`,
  );
  const maxW = l.fullWidth ? "max-w-none" : "max-w-[1280px]";
  const contentAlign = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  const containerPos = align === "center" ? "mx-auto" : align === "right" ? "ml-auto" : "mr-auto";
  const { ref, isVisible } = useScrollReveal();

  if (items.length === 0) return null;

  // Three or four items read best; the grid adapts without stranding one
  // item alone on the last line.
  const cols = items.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3";

  return (
    <RowSection row={row} fullHeight={false}>
      <div ref={ref as any} className={`${maxW} ${containerPos} ${contentAlign} row-container`}>
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

        <dl className={`mt-8 grid grid-cols-1 ${cols} gap-px overflow-hidden rounded-[var(--radius)] border row-border`} style={{ background: "var(--row-border, hsl(var(--border)))" }}>
          {items.map((item, i) => (
            <div
              key={i}
              className="px-6 py-7 flex flex-col gap-2 items-start"
              style={{ ...revealStyle(isVisible, 0.4 + i * 0.08), background: "var(--row-surface, hsl(var(--background) / 0.7))" }}
            >
              {item.logo ? (
                <img
                  src={item.logo}
                  alt={resolveImageAlt(item.logo_alt, item.label || "Client logo")}
                  loading="lazy"
                  className="h-8 w-auto object-contain opacity-80"
                />
              ) : (
                <dt className="font-display font-bold leading-none row-fg" style={{ fontSize: "var(--fs-stat)" }}>
                  {item.value}
                </dt>
              )}
              <dd className="font-body text-sm leading-snug row-fg-muted measure">{item.label}</dd>
            </div>
          ))}
        </dl>

        {c.note && <RowNote color={c.color_note}>{c.note}</RowNote>}
      </div>
    </RowSection>
  );
};

export default ProofBandRow;
