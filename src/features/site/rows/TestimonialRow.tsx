/**
 * ─────────────────────────────────────────────────────────────────────────
 * TestimonialRow.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Public renderer for `type: "testimonial"` rows.
 *
 * DATA CONTRACT (junior-engineer guide)
 * ─────────────────────────────────────
 * The JSON in `row.content` looks like this:
 * {
 *   "eyebrow": "Loved by leaders",            // optional
 *   "title_lines": ["<p>What clients say</p>"],
 *   "subtitle": "",                            // optional
 *   "items": [
 *     {
 *       "quote": "<p>They saved our quarter.</p>",
 *       "name": "Ada Lovelace",
 *       "role": "Head of People · Engine Co.",
 *       "avatar": "https://…/ada.jpg",
 *       "avatar_alt": "Portrait of Ada Lovelace"
 *     }
 *   ]
 * }
 *
 * RENDERING NOTES
 * ───────────────
 * - Uses the project's shared <Carousel /> primitive (Embla wrapped) so
 *   navigation arrows and keyboard support come for free.
 * - On screens ≥ md we show two cards per slide; on phones one card.
 * - Cards use a "liquid glass" surface (backdrop-blur + border) which is
 *   our brand-standard glassmorphism — see `mem://brand/identity`.
 * - Every visual choice is a Tailwind utility on a design-token color.
 *   No raw colors. If you need a new shade add it as an HSL token in
 *   `index.css`/`tailwind.config.ts` first.
 * ───────────────────────────────────────────────────────────────────────── */

import type { PageRow } from "@/types/rows";
import type { TestimonialItem } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/types/rows";
import { sanitizeHtml } from "@/services/sanitize";
import { resolveImageAlt } from "@/services/imageAlt";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import { RowEyebrow, RowTitle, RowSubtitle, RowSection } from "./typography";
import type { Alignment, VAlign } from "./PageRows";

const TestimonialRow = ({
  row,
  rowIndex: _rowIndex,
  align = "left",
  vAlign: _vAlign = "middle",
}: {
  row: PageRow;
  rowIndex?: number;
  align?: Alignment;
  vAlign?: VAlign;
}) => {
  const c = row.content || {};
  const l = { ...DEFAULT_ROW_LAYOUT, ...row.layout };
  const items: TestimonialItem[] = Array.isArray(c.items) ? c.items : [];
  const titleLines: string[] = (c.title_lines || []).map((li: any) =>
    typeof li === "string" ? (li.startsWith("<") ? li : `<p>${li}</p>`) : `<p>${li}</p>`,
  );
  const maxW = l.fullWidth ? "max-w-none" : "max-w-[1100px]";
  const contentAlign =
    align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  const containerPos =
    align === "center" ? "mx-auto" : align === "right" ? "ml-auto mr-6" : "mr-auto ml-6";
  const { ref, isVisible } = useScrollReveal();

  if (items.length === 0) return null;

  return (
    <RowSection row={row}>
      {/* `l` (resolved layout) is used inside via maxW; row prop carries
       * bg_color, bg_image, gradients, overlays into <RowSection/>. */}
      <div ref={ref as any} className={`${maxW} ${containerPos} ${contentAlign} px-4 md:px-8`}>
        {/* Optional header */}
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

        {/*
         * The carousel itself. `align="start"` keeps cards left-aligned
         * inside the viewport so the first card is always fully visible
         * even on narrow screens. `loop` lets users keep swiping past
         * the last quote back to the first.
         */}
        <Carousel
          opts={{ align: "start", loop: items.length > 2 }}
          className="mt-10 relative"
        >
          <CarouselContent className="-ml-4">
            {items.map((item, i) => (
              <CarouselItem key={i} className="pl-4 basis-full md:basis-1/2">
                {/*
                 * Glassmorphism card. `bg-card/60 + backdrop-blur` gives
                 * the frosted look against any row background.
                 */}
                <article
                  className="h-full rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-6 md:p-8 shadow-sm flex flex-col gap-5 text-left"
                  style={revealStyle(isVisible, 0.4 + i * 0.1)}
                >
                  <div
                    className="font-body text-foreground/90 text-base md:text-lg leading-relaxed [&>p]:my-1"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.quote || "") }}
                  />
                  <div className="flex items-center gap-3 mt-auto">
                    {item.avatar ? (
                      <img
                        src={item.avatar}
                        alt={resolveImageAlt(item.avatar_alt, item.name || "Client portrait")}
                        loading="lazy"
                        className="w-12 h-12 rounded-full object-cover border border-border/40"
                      />
                    ) : (
                      <div
                        aria-hidden
                        className="w-12 h-12 rounded-full bg-secondary/15 text-secondary flex items-center justify-center font-display text-sm"
                      >
                        {(item.name || "•").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-display text-sm font-semibold text-foreground truncate">
                        {item.name}
                      </div>
                      {item.role && (
                        <div className="font-body text-xs text-muted-foreground truncate">
                          {item.role}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              </CarouselItem>
            ))}
          </CarouselContent>
          {items.length > 1 && (
            <>
              <CarouselPrevious className="hidden md:flex -left-4" />
              <CarouselNext className="hidden md:flex -right-4" />
            </>
          )}
        </Carousel>
      </div>
    </RowSection>
  );
};

export default TestimonialRow;
