import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT, getRowColumns, multiColGridStyle } from "@/lib/constants/rowDefaults";
import { sanitizeHtml } from "@/services/sanitize";
import EditableText from "@/features/admin/EditableText";
import SubscribeWidget from "@/features/site/SubscribeWidget";
import type { Alignment, VAlign } from "./PageRows";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import { useAutoFitText } from "@/hooks/useAutoFitText";
import { RowEyebrow, RowTitle, RowSubtitle, RowSection } from "./typography";
import Icon from "@/features/icons/Icon";
import { pillarColorFromLink } from "@/lib/constants/pillarColors";
import { trackConversion } from "@/services/conversions";
import RowCoverCard from "@/features/site/RowCoverCard";
import type { BoxedContent, BoxedCard } from "@/features/widgets/boxed/schema";

/**
 * Smart link helper — internal anchors / paths stay in-tab, external
 * URLs open in a new tab with safe rel.
 */
const isExternal = (url: string) => /^https?:\/\//i.test(url);

const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

const BoxedRow = ({ row, rowIndex, align = "left", vAlign = "middle" }: { row: PageRow; rowIndex?: number; align?: Alignment; vAlign?: VAlign }) => {
  const { contents, widths, isMultiCol } = getRowColumns(row);
  const l = { ...DEFAULT_ROW_LAYOUT, ...row.layout };
  const maxW = l.fullWidth ? "max-w-none" : "max-w-[1280px]";
  const contentAlign = align === "center" ? "text-center"
    : align === "right" ? "text-right"
    : "text-left";
  const containerPos = align === "center" ? "mx-auto"
    : align === "right" ? "ml-auto mr-6"
    : "mr-auto ml-6";

  const { ref, isVisible } = useScrollReveal();
  const autoFitRef = useAutoFitText();

  // Optional cover image — a flat, row-level field (not per-column, not
  // per-card: confirmed against live "Our Vows" content, which is a
  // single-column row with no columns_data). Scoped to the single-column
  // case on purpose: a multi-column row has no one place a single cover
  // image would unambiguously belong to.
  const coverImage = !isMultiCol ? (row.content?.cover_image?.trim() || undefined) : undefined;

  const getGridCols = (count: number) => {
    if (count <= 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-1 md:grid-cols-2";
    if (count === 3) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
    if (count === 4) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
    return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  };

  // `c` is typed against the boxed schema; stored content reaches this
  // renderer through the registry's parse step, so every field below
  // exists (defaults filled) even for rows saved by older admin builds.
  const renderColumnContent = (c: BoxedContent, colIndex: number) => {
    const prefix = rowIndex !== undefined
      ? (colIndex === 0 ? `rows.${rowIndex}.content` : `rows.${rowIndex}.columns_data.${colIndex - 1}`)
      : "";
    const titleLines: string[] = (c.title_lines || []).map((li: unknown) =>
      typeof li === "string" ? li.startsWith("<") ? li : `<p>${li}</p>` : `<p>${li}</p>`
    );
    const cards: BoxedCard[] = c.cards || [];
    const noteColor = c.color_note || "hsl(var(--foreground) / 0.5)";

    const renderCard = (card: BoxedCard, i: number) => {
      const cardLink: string | undefined = card.link_url?.trim() || undefined;
      // Per-card accent for the icon, title and a 3px top border, from
      // two sources in priority order:
      //   1. A card linking to one of the 4 service pillars gets that
      //      pillar's brand color, so the homepage "Our Services" grid
      //      reads as 4 distinct pillars rather than 4 identical cards.
      //      Pillar identity wins because it is tied to navigation.
      //   2. `accent_color` set on the card itself in the admin (e.g.
      //      the "Why The Magic Coffin" cards).
      // Neither present → the row's shared Card Title Color applies.
      // Trimmed like the sibling string fields: a whitespace-only value
      // is not a colour and must fall through, not produce `3px solid  `.
      const pillarColor = pillarColorFromLink(cardLink);
      const cardAccent: string | undefined = pillarColor || card.accent_color?.trim() || undefined;
      const titleColor = cardAccent || c.color_card_title || "hsl(var(--vows-card-title))";
      const bodyColor = c.color_card_body || "hsl(var(--vows-card-body))";
      const cardCtaUrl: string | undefined = card.cta_url?.trim() || undefined;
      const cardCtaLabel: string | undefined = card.cta_label?.trim() || undefined;

      const innerCard = (
        <>
          {card.icon && (
            <div className="mb-3" style={{ color: titleColor }}>
              <Icon value={card.icon} size={28} />
            </div>
          )}
          <EditableText sectionKey="page_rows" fieldPath={`${prefix}.cards.${i}.title`} as="p"
            className="font-body-heading font-bold mb-3 text-lg leading-[1.6]" style={{ color: titleColor }}>{card.title}</EditableText>
          <EditableText sectionKey="page_rows" fieldPath={`${prefix}.cards.${i}.body`} html as="div"
            data-rte-fit=""
            className="rich-text font-body text-xs leading-[1.6] [&_p]:mb-3 [&_p]:mt-3" style={{ color: bodyColor, overflow: "visible", height: "auto" }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(card.body) }} />

          {cardCtaUrl && cardCtaLabel && (
            <div className="mt-rhythm-base">
              {cardLink ? (
                // The card itself is already an <a> (cardLink below), so this
                // CTA can't also be an <a> without nesting anchors — invalid
                // HTML5 and inconsistent click targets across browsers. A
                // button that stops propagation and navigates manually keeps
                // the same click behavior without the nesting.
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    trackConversion("cta_click", cardCtaLabel);
                    if (isExternal(cardCtaUrl)) {
                      window.open(cardCtaUrl, "_blank", "noopener,noreferrer");
                    } else {
                      window.location.href = cardCtaUrl;
                    }
                  }}
                  className="btn-ink"
                >
                  {cardCtaLabel}
                </button>
              ) : (
                <a
                  href={cardCtaUrl}
                  target={isExternal(cardCtaUrl) ? "_blank" : undefined}
                  rel={isExternal(cardCtaUrl) ? "noopener noreferrer" : undefined}
                  className="btn-ink"
                  onClick={() => trackConversion("cta_click", cardCtaLabel)}
                >
                  {cardCtaLabel}
                </a>
              )}
            </div>
          )}
        </>
      );

      // Clean, structured card enclosure: solid card surface, crisp
      // 1px border, uniform padding and a subtle shadow. `boxed-lift`
      // keeps the GPU-friendly hover transform (no icon shake).
      // When the row has a cover image, cards restyle as lighter,
      // smaller-radius tiles nested inside that photo-card container
      // — `surface-card`'s own border-radius (var(--radius), 1.5rem)
      // would look wrong repeated at the same size one level down.
      const cardClass = `${coverImage ? "" : "surface-card"} p-6 md:p-8 text-left boxed-lift ${cardLink ? "block hover:shadow-md cursor-pointer" : ""}`;
      // Order matters: `border` is a shorthand that resets border-top, so
      // the accent's `borderTop` must come AFTER the cover-image block or
      // accent cards inside a cover-image row lose their top bar.
      const cardStyle = {
        ...revealStyle(isVisible, i + 2),
        ...(coverImage
          ? {
              backgroundColor: "hsl(var(--primary) / 0.045)",
              border: "1px solid hsl(var(--border))",
              borderRadius: "1rem",
            }
          : {}),
        ...(cardAccent ? { borderTop: `3px solid ${cardAccent}` } : {}),
      } as React.CSSProperties;

      if (cardLink) {
        return (
          <a
            key={i}
            href={cardLink}
            target={isExternal(cardLink) ? "_blank" : undefined}
            rel={isExternal(cardLink) ? "noopener noreferrer" : undefined}
            className={cardClass}
            style={{ ...cardStyle, textDecoration: "none" }}
          >
            {innerCard}
          </a>
        );
      }

      return (
        <div key={i} className={cardClass} style={cardStyle}>
          {innerCard}
        </div>
      );
    };

    return (
      <div key={colIndex}>
        {c.eyebrow && (
          /* No hardcoded fallback colour: the section band publishes
             `--row-fg`, so headings stay readable on white, tint and
             deep bands alike. Admin overrides still win. */
          <RowEyebrow color={c.color_eyebrow} style={revealStyle(isVisible, -0.5)}>
            <EditableText sectionKey="page_rows" fieldPath={`${prefix}.eyebrow`} as="span">{c.eyebrow}</EditableText>
          </RowEyebrow>
        )}

        {titleLines.length > 0 && (
          <RowTitle icon={c.icon} color={c.color_title} style={revealStyle(isVisible, 0)}>
            {titleLines.map((line, i) => (<span key={i}>{i > 0 && <br />}<span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} /></span>))}
          </RowTitle>
        )}

        {c.subtitle && (
          <RowSubtitle handwritten={!!c.subtitle_handwritten} color={c.subtitle_color} style={revealStyle(isVisible, 1)}>
            <EditableText sectionKey="page_rows" fieldPath={`${prefix}.subtitle`} as="span">{c.subtitle}</EditableText>
          </RowSubtitle>
        )}


        {cards.length === 5 ? (
          // A single grid can't split 5 cards as 2-then-3 with each row's
          // cards stretching to fill the full row width — the column count
          // is fixed for the whole grid, so a short final row leaves a dead
          // empty track instead of redistributing width. Two independent
          // full-width sub-grids (2-col, then 3-col) each stretch their own
          // cards to fill their own row.
          <div className={`flex flex-col gap-6 lg:gap-8 ${titleLines.length > 0 && !c.subtitle ? "mt-rhythm-loose" : "mt-rhythm-base"}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
              {cards.slice(0, 2).map((card, i) => renderCard(card, i))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
              {cards.slice(2, 5).map((card, i) => renderCard(card, i + 2))}
            </div>
          </div>
        ) : (
          <div className={`grid ${getGridCols(cards.length)} gap-6 lg:gap-8 items-stretch ${titleLines.length > 0 && !c.subtitle ? "mt-rhythm-loose" : "mt-rhythm-base"}`}>
            {cards.slice(0, 6).map((card, i) => renderCard(card, i))}
          </div>
        )}


        {c.note && (
          <div className="mt-rhythm-base pt-3" style={{ ...revealStyle(isVisible, cards.length + 2), borderTop: "1px solid hsl(var(--foreground) / 0.1)" }}>
            <p className="font-body text-xs italic leading-[1.6]" style={{ color: noteColor }}>{c.note}</p>
          </div>
        )}

        {c.cta_url && c.cta_label && (
          <div className="mt-rhythm-base" style={revealStyle(isVisible, cards.length + 3)}>
            <a href={c.cta_url} target={c.cta_url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
              className="btn-ink"
>
              {c.cta_label}
            </a>
          </div>
        )}

        {c.show_subscribe && <div className="mt-rhythm-loose" style={revealStyle(isVisible, cards.length + 2)}><SubscribeWidget align={align} /></div>}
      </div>
    );
  };

  return (
    <RowSection
      row={row}
      vAlign={vAlign}
      innerRef={(el) => { autoFitRef.current = el; }}
    >
      {!isMultiCol && coverImage ? (
        // Full-bleed to the row's OWN content boundary (same max-width the
        // row-container below uses) rather than sitting inset inside
        // row-container's fluid clamp(24px,5vw,96px) gutter — the card's
        // edges and corners should read as the row's own surface, not as
        // a smaller card floating inside it.
        <div className={`relative z-10 w-full ${l.fullWidth ? "" : "max-w-[1280px]"} mx-auto`}>
          <RowCoverCard row={row}>{renderColumnContent(contents[0] as BoxedContent, 0)}</RowCoverCard>
        </div>
      ) : (
        <div ref={ref} className={`relative z-10 row-container ${isMultiCol ? `${l.fullWidth ? "" : "max-w-[1280px]"} ${containerPos}` : `${maxW} ${containerPos} ${contentAlign}`}`}>
          {isMultiCol ? (
            <div style={multiColGridStyle(widths)} className="items-start">
              {contents.map((c, i) => renderColumnContent(c as BoxedContent, i))}
            </div>
          ) : (
            renderColumnContent(contents[0] as BoxedContent, 0)
          )}
        </div>
      )}
    </RowSection>
  );
};

export default BoxedRow;
