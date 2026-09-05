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

  const renderColumnContent = (c: Record<string, any>, colIndex: number) => {
    const prefix = rowIndex !== undefined
      ? (colIndex === 0 ? `rows.${rowIndex}.content` : `rows.${rowIndex}.columns_data.${colIndex - 1}`)
      : "";
    const titleLines: string[] = (c.title_lines || []).map((li: any) =>
      typeof li === "string" ? li.startsWith("<") ? li : `<p>${li}</p>` : `<p>${li}</p>`
    );
    const cards: { title: string; body: string }[] = c.cards || [];
    const noteColor = c.color_note || "hsl(var(--foreground) / 0.5)";

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
          <RowSubtitle color={c.subtitle_color} style={revealStyle(isVisible, 1)}>
            <EditableText sectionKey="page_rows" fieldPath={`${prefix}.subtitle`} as="span">{c.subtitle}</EditableText>
          </RowSubtitle>
        )}


        <div className={`grid ${getGridCols(cards.length)} gap-6 lg:gap-8 items-stretch ${titleLines.length > 0 && !c.subtitle ? "mt-rhythm-loose" : "mt-rhythm-base"}`}>
          {cards.slice(0, 6).map((card: any, i: number) => {
            const cardLink: string | undefined = card.link_url?.trim() || undefined;
            // A card linking to one of the 4 service pillars gets that
            // pillar's own brand color for its icon/title (and a matching
            // top-accent border below) instead of the row's one shared
            // color — so e.g. the homepage "Our Services" grid reads as 4
            // distinct pillars, not 4 identical purple cards. Any other
            // boxed-card row (testimonials, "Our Vows", etc.) has no
            // pillar-matching link_url, so pillarColor is always
            // undefined there and behavior is unchanged.
            const pillarColor = pillarColorFromLink(cardLink);
            const titleColor = pillarColor || c.color_card_title || "hsl(var(--vows-card-title))";
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
                  className="font-body text-xs leading-[1.6] [&_p]:mb-3 [&_p]:mt-3" style={{ color: bodyColor, overflow: "visible", height: "auto" }}
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
            const cardStyle = {
              ...revealStyle(isVisible, i + 2),
              ...(pillarColor ? { borderTop: `3px solid ${pillarColor}` } : {}),
              ...(coverImage
                ? {
                    backgroundColor: "hsl(var(--primary) / 0.045)",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "1rem",
                  }
                : {}),
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
          })}
        </div>


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
          <RowCoverCard row={row}>{renderColumnContent(contents[0], 0)}</RowCoverCard>
        </div>
      ) : (
        <div ref={ref} className={`relative z-10 row-container ${isMultiCol ? `${l.fullWidth ? "" : "max-w-[1280px]"} ${containerPos}` : `${maxW} ${containerPos} ${contentAlign}`}`}>
          {isMultiCol ? (
            <div style={multiColGridStyle(widths)} className="items-start">
              {contents.map((c, i) => renderColumnContent(c, i))}
            </div>
          ) : (
            renderColumnContent(contents[0], 0)
          )}
        </div>
      )}
    </RowSection>
  );
};

export default BoxedRow;
