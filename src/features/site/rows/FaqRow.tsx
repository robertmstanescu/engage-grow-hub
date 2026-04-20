/**
 * ─────────────────────────────────────────────────────────────────────────
 * FaqRow.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Public renderer for `type: "faq"` rows.
 *
 * DATA CONTRACT (junior-engineer guide)
 * ─────────────────────────────────────
 * `row.content` shape:
 * {
 *   "title_lines": ["<p>Frequently asked</p>"],
 *   "subtitle": "Everything you wanted to know.",
 *   "items": [
 *     { "question": "How long does onboarding take?",
 *       "answer": "<p>About <strong>two weeks</strong>.</p>" }
 *   ]
 * }
 *
 * BEHAVIOUR
 * ─────────
 * Per product decision the accordion uses Radix's "multiple" mode — users
 * can keep more than one answer open at a time. Switch to `type="single"`
 * if you need only-one-open behaviour.
 * ───────────────────────────────────────────────────────────────────────── */

import type { PageRow, FaqItem } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/types/rows";
import { sanitizeHtml } from "@/services/sanitize";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import { RowEyebrow, RowTitle, RowSubtitle, RowBody, RowSection } from "./typography";
import SubscribeWidget from "@/features/site/SubscribeWidget";
import type { Alignment, VAlign } from "./PageRows";

const FaqRow = ({
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
  const items: FaqItem[] = Array.isArray(c.items) ? c.items : [];
  const titleLines: string[] = (c.title_lines || []).map((li: any) =>
    typeof li === "string" ? (li.startsWith("<") ? li : `<p>${li}</p>`) : `<p>${li}</p>`,
  );
  const maxW = l.fullWidth ? "max-w-none" : "max-w-[820px]";
  const contentAlign =
    align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  const containerPos =
    align === "center" ? "mx-auto" : align === "right" ? "ml-auto mr-6" : "mr-auto ml-6";
  const { ref, isVisible } = useScrollReveal();

  if (items.length === 0 && titleLines.length === 0) return null;

  return (
    <RowSection row={row}>
      <div ref={ref as any} className={`${maxW} ${containerPos} ${contentAlign} px-4 md:px-8`}>
        {c.eyebrow && (
          <RowEyebrow color={c.color_eyebrow || "hsl(var(--secondary))"} style={revealStyle(isVisible, -0.5)}>
            {c.eyebrow}
          </RowEyebrow>
        )}
        {titleLines.length > 0 && (
          <RowTitle style={revealStyle(isVisible, 0)}>
            {titleLines.map((line, i) => (
              <span
                key={i}
                className="block"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(line) }}
              />
            ))}
          </RowTitle>
        )}
        {c.subtitle && (
          <RowSubtitle color={c.subtitle_color || ""} style={revealStyle(isVisible, 0.3)}>
            {c.subtitle}
          </RowSubtitle>
        )}
        {/* Optional rich-text body — part of the standard Brand Header
         *  block exposed by every "new" row editor. RowBody does NOT
         *  sanitise the html prop itself, so we MUST pass it through
         *  sanitizeHtml() here. */}
        {c.body && (
          <RowBody html={sanitizeHtml(c.body)} style={revealStyle(isVisible, 0.35)} />
        )}

        <Accordion
          type="multiple"
          className="mt-8 w-full text-left"
          style={revealStyle(isVisible, 0.4)}
        >
          {items.map((item, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="border-b border-border/60"
            >
              <AccordionTrigger className="font-display text-base md:text-lg text-foreground hover:no-underline py-5">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="font-body text-sm md:text-base text-muted-foreground leading-relaxed pb-5">
                <div
                  className="[&>p]:my-1"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.answer || "") }}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Universal subscribe widget — see SubscribeToggle.tsx. */}
        {c.show_subscribe && (
          <div className="mt-rhythm-loose" style={revealStyle(isVisible, 0.6)}>
            <SubscribeWidget align={align} />
          </div>
        )}
      </div>
    </RowSection>
  );
};

export default FaqRow;
