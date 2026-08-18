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

/**
 * Smart link helper — internal anchors / paths stay in-tab, external
 * URLs open in a new tab with safe rel.
 */
const isExternal = (url: string) => /^https?:\/\//i.test(url);

const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

const BoxedRow = ({ row, rowIndex, align = "left", vAlign = "middle" }: { row: PageRow; rowIndex?: number; align?: Alignment; vAlign?: VAlign }) => {
  const { contents, widths, isMultiCol } = getRowColumns(row);
  const l = { ...DEFAULT_ROW_LAYOUT, ...row.layout };
  const maxW = l.fullWidth ? "max-w-none" : "max-w-[1100px]";
  const contentAlign = align === "center" ? "text-center"
    : align === "right" ? "text-right"
    : "text-left";
  const containerPos = align === "center" ? "mx-auto"
    : align === "right" ? "ml-auto mr-6"
    : "mr-auto ml-6";

  const { ref, isVisible } = useScrollReveal();
  const autoFitRef = useAutoFitText();

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
            const titleColor = c.color_card_title || "hsl(var(--vows-card-title))";
            const bodyColor = c.color_card_body || "hsl(var(--vows-card-body))";
            const cardLink: string | undefined = card.link_url?.trim() || undefined;
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
                  className="font-body text-xs leading-[1.6] [&_p]:mb-[5px] [&_p]:mt-[5px]" style={{ color: bodyColor, overflow: "visible", height: "auto" }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(card.body) }} />

                {cardCtaUrl && cardCtaLabel && (
                  <div className="mt-rhythm-base">
                    <a
                      href={cardCtaUrl}
                      target={isExternal(cardCtaUrl) ? "_blank" : undefined}
                      rel={isExternal(cardCtaUrl) ? "noopener noreferrer" : undefined}
                      onClick={(e) => { if (cardLink) e.stopPropagation(); }}
                      className="btn-ink"
>
                      {cardCtaLabel}
                    </a>
                  </div>
                )}
              </>
            );

            // Clean, structured card enclosure: solid card surface, crisp
            // 1px border, uniform padding and a subtle shadow. `boxed-lift`
            // keeps the GPU-friendly hover transform (no icon shake).
            const cardClass = `surface-card p-6 md:p-8 text-left boxed-lift ${cardLink ? "block hover:shadow-md cursor-pointer" : ""}`;
            const cardStyle = { ...revealStyle(isVisible, i + 2) } as React.CSSProperties;

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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-10 blur-[150px] pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(46 75% 60%), transparent)" }} />

      <div ref={ref} className={`relative z-10 row-container ${isMultiCol ? `${l.fullWidth ? "" : "max-w-[1200px]"} ${containerPos}` : `${maxW} ${containerPos} ${contentAlign}`}`}>
        {isMultiCol ? (
          <div style={multiColGridStyle(widths)} className="items-start">
            {contents.map((c, i) => renderColumnContent(c, i))}
          </div>
        ) : (
          renderColumnContent(contents[0], 0)
        )}
      </div>
    </RowSection>
  );
};

export default BoxedRow;
