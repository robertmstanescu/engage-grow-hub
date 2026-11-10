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
import { sanitizeHtml } from "@/services/sanitize";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import { RowEyebrow, RowTitle, RowSubtitle, RowBody, RowSection } from "./typography";
import RowNote from "./typography/RowNote";
import type { Alignment, VAlign } from "./PageRows";
import { transformImageUrl } from "@/services/mediaOptimization";
import { focalObjectPosition } from "@/lib/imageShape";

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
  const items: FaqItem[] = Array.isArray(c.items) ? c.items : [];
  const titleLines: string[] = (c.title_lines || []).map((li: unknown) =>
    typeof li === "string" ? (li.startsWith("<") ? li : `<p>${li}</p>`) : `<p>${li}</p>`,
  );
  const contentAlign =
    align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  const { ref, isVisible } = useScrollReveal();

  if (items.length === 0 && titleLines.length === 0) return null;
  const coverImage = c.cover_image?.trim() || undefined;

  /* Two columns from 1024px (artboards): the heading block on the left
     (with the row's picture under it when one is set), every question
     on the right, closed by default (owner, 10 Nov 2026; "Start with
     the answers open" in the editor turns that round). A closed answer
     is still in the HTML. Stacks below 1024px. */
  const headSpan = coverImage ? "lg:col-span-5" : "lg:col-span-4";
  const listSpan = coverImage ? "lg:col-span-7" : "lg:col-span-8";

  return (
    <RowSection row={row}>
      <div ref={ref} className={`max-w-[1280px] mx-auto w-full row-container text-left`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
          <div className={`${headSpan} flex flex-col ${contentAlign}`} style={{ gap: 6 }}>
            {c.eyebrow && (
              <RowEyebrow color={c.color_eyebrow || ""} style={revealStyle(isVisible, -0.5)}>
                {c.eyebrow}
              </RowEyebrow>
            )}
            {titleLines.length > 0 && (
              <RowTitle icon={c.icon} className="!mb-0" style={{ ...revealStyle(isVisible, 0), ...(coverImage ? null : { fontSize: "clamp(30px, 3vw, 44px)" }) }}>
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
              <RowSubtitle handwritten={!!c.subtitle_handwritten} color={c.subtitle_color || ""} style={{ ...revealStyle(isVisible, 0.3), marginTop: 12 }}>
                {c.subtitle}
              </RowSubtitle>
            )}
            {c.body && (
              <RowBody html={sanitizeHtml(c.body)} style={revealStyle(isVisible, 0.35)} />
            )}
            {coverImage && (
              <img
                src={transformImageUrl(coverImage, { width: 1000, aspectRatio: 3 / 2 })}
                alt={c.cover_image_alt || ""}
                loading="lazy"
                decoding="async"
                className="w-full object-cover"
                style={{ height: 360, borderRadius: 24, marginTop: 24, objectPosition: focalObjectPosition(c.cover_image_focal_x, c.cover_image_focal_y) }}
              />
            )}
          </div>

          <div className={listSpan}>
            <Accordion
              type="multiple"
              defaultValue={c.start_open === true ? items.map((_, i) => `item-${i}`) : []}
              className="w-full text-left faq-list"
              style={revealStyle(isVisible, 0.4)}
            >
              {items.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="border-b"
                  style={{ borderColor: "hsl(var(--line-1))" }}
                >
                  <AccordionTrigger
                    className="faq-trigger font-display hover:no-underline text-left [&>svg]:hidden"
                    style={{ fontSize: 19, fontWeight: 600, lineHeight: 1.3, color: "var(--row-heading, hsl(var(--heading)))", padding: "22px 0 12px", gap: 24 }}
                  >
                    <span className="text-left w-full">{item.question}</span>
                    <span aria-hidden className="faq-toggle" />
                  </AccordionTrigger>
                  <AccordionContent
                    /* Closed answers stay in the page so search engines and
                       the prerender still read them; `.faq-list` hides them. */
                    forceMount
                    className="font-body text-left"
                    style={{ fontSize: 16, lineHeight: 1.7, color: "var(--row-body, hsl(var(--body)))", paddingBottom: 14 }}
                  >
                    <div
                      className="rich-text text-left [&>p]:mt-0 [&>p]:mb-[10px]"
                      style={{ maxWidth: 720 }}
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.answer || "") }}
                    />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            {c.note && <RowNote color={c.color_note}>{c.note}</RowNote>}
          </div>
        </div>
      </div>
    </RowSection>
  );
};

export default FaqRow;
