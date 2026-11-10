import type { PageRow } from "@/types/rows";
import { safeHref } from "@/services/safeHref";
import { DEFAULT_ROW_LAYOUT, getRowColumns, multiColGridStyle } from "@/lib/constants/rowDefaults";
import { sanitizeHtml } from "@/services/sanitize";
import EditableText from "@/features/admin/EditableText";
import type { Alignment, VAlign } from "./PageRows";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import { RowEyebrow, RowTitle, RowSubtitle, RowSection } from "./typography";
import Icon from "@/features/icons/Icon";
import { pillarColorFromLink, pillarColorFromKey } from "@/lib/constants/pillarColors";
import { trackConversion } from "@/services/conversions";
import RowCoverCard from "@/features/site/RowCoverCard";
import type { BoxedContent, BoxedCard } from "@/features/widgets/boxed/schema";

/**
 * Smart link helper — internal anchors / paths stay in-tab, external
 * URLs open in a new tab with safe rel.
 */
const isExternal = (url: string) => /^https?:\/\//i.test(url);

const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

/** Grid-card markers for the vows look (marker_style === "roman"). */
const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

const BoxedRow = ({ row, rowIndex, align = "left", vAlign = "middle" }: { row: PageRow; rowIndex?: number; align?: Alignment; vAlign?: VAlign }) => {
  const { contents, widths, isMultiCol } = getRowColumns(row);
  const l = { ...DEFAULT_ROW_LAYOUT, ...row.layout };
  const maxW = l.fullWidth ? "max-w-none" : "max-w-[1280px]";
  const contentAlign = align === "center" ? "text-center"
    : align === "right" ? "text-right"
    : "text-left";
  const containerPos = align === "center" ? "mx-auto"
    : align === "right" ? "mx-auto"
    : "mx-auto";

  const { ref, isVisible } = useScrollReveal();

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
    /* Four cards sit two by two (artboards), never four across. */
    if (count === 4) return "grid-cols-1 md:grid-cols-2";
    return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  };

  // `c` is typed against the boxed schema; stored content reaches this
  // renderer through the registry's parse step, so every field below
  // exists (defaults filled) even for rows saved by older admin builds.
  const renderColumnContent = (c: BoxedContent, colIndex: number) => {
    const prefix = rowIndex !== undefined
      ? (colIndex === 0 ? `rows.${rowIndex}.content` : `rows.${rowIndex}.columns_data.${colIndex - 1}`)
      : "";
    /* Lines with no text (an admin cleared the title, or a saved "<p></p>")
       are dropped, otherwise the row prints an empty <h2>. */
    const titleLines: string[] = (c.title_lines || [])
      .map((li: unknown) => (typeof li === "string" ? (li.startsWith("<") ? li : `<p>${li}</p>`) : `<p>${li}</p>`))
      .filter((li) => li.replace(/<[^>]*>/g, "").trim().length > 0);
    const cards: BoxedCard[] = c.cards || [];
    const noteColor = c.color_note || "hsl(var(--foreground) / 0.5)";
    const headGap = titleLines.length > 0 && !c.subtitle ? "mt-rhythm-loose" : "mt-rhythm-base";
    const indexed = cards.slice(0, 12).map((card, i) => ({ card, i }));
    const darkCards = c.marker_style ? indexed.filter(({ card }) => card.variant === "dark") : [];
    const lightCards = indexed.filter((entry) => !darkCards.includes(entry));

    const renderCard = (card: BoxedCard, i: number) => {
      const cardLink: string | undefined = card.link_url?.trim() ? safeHref(card.link_url) : undefined;
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
      const pillarColor = pillarColorFromLink(cardLink) || pillarColorFromKey(card.pillar);
      const cardAccent: string | undefined = pillarColor || card.accent_color?.trim() || undefined;
      /* Named card looks (redesign §2.3): "" keeps the default surface;
         "dark" flips to the deep band tokens; "glass" frosts over the
         page mesh; "pillar" only steers the accent (border/icon/title). */
      const variant = card.variant || "";
      const isDarkCard = variant === "dark";
      /* Titles are heading purple on every light card (artboards): the
         pillar colour lives on the top border, dot, number and link. A
         colour the owner set on the card itself still tints its title. */
      const titleColor = isDarkCard
        ? "hsl(var(--deep-fg))"
        : (!pillarColor && card.accent_color?.trim()) || c.color_card_title || "hsl(var(--heading))";
      const bodyColor = isDarkCard
        ? "hsl(var(--deep-fg) / 0.8)"
        : c.color_card_body || "hsl(var(--body))";
      const cardCtaUrl: string | undefined = card.cta_url?.trim() ? safeHref(card.cta_url) : undefined;
      const cardCtaLabel: string | undefined = card.cta_label?.trim() || undefined;

      /* Marker above the title (redesign): replaces the icon when set.
         "roman" = gold numeral (vows), "pillar_number" = pillar dot and
         a two-digit number (service cards), "bar" = short heading-colour
         rule (fix cards). */
      const marker = c.marker_style || "";
      const showIcon = Boolean(card.icon) && !marker;
      /* Four parts (marker, title, text, footer) that share their rows
         with the neighbouring cards inside `.align-cards`, so a two-line
         title pushes every card's text down to the same line. */
      const innerCard = (
        <>
          <div>
          {marker === "roman" && (
            <span
              aria-hidden
              className="block font-display font-extrabold leading-none"
              style={{ color: "hsl(var(--gold-text))", fontSize: 40, marginBottom: 14 }}
            >
              {ROMAN_NUMERALS[i] ?? String(i + 1)}
            </span>
          )}
          {marker === "pillar_number" && (
            <span aria-hidden className="flex items-center gap-2.5" style={{ marginBottom: 14 }}>
              <span style={{ width: 12, height: 12, borderRadius: 999, background: cardAccent || "hsl(var(--heading))" }} />
              <span className="font-display font-bold" style={{ fontSize: 15, color: cardAccent || "hsl(var(--heading))" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
            </span>
          )}
          {marker === "bar" && !isDarkCard && (
            <span aria-hidden className="block" style={{ width: 36, height: 4, borderRadius: 4, background: "hsl(var(--heading))", marginBottom: 14 }} />
          )}
          {showIcon && (
            <div className="mb-3" style={{ color: titleColor }}>
              <Icon value={card.icon!} size={28} />
            </div>
          )}
          </div>
          <EditableText sectionKey="page_rows" fieldPath={`${prefix}.cards.${i}.title`} as="p"
            className="font-display font-bold leading-[1.15]" style={{ color: titleColor, fontSize: "var(--fs-card-title)", marginBottom: 12 }}>{card.title}</EditableText>
          <EditableText sectionKey="page_rows" fieldPath={`${prefix}.cards.${i}.body`} html as="div"
            className="rich-text font-body leading-[var(--lh-card-body)] flex-grow" style={{ color: bodyColor, fontSize: "var(--fs-card-body)", overflow: "visible", height: "auto", ["--para-space" as string]: "0.75em" } as React.CSSProperties}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(card.body) }} />

          <div className="flex flex-col items-start">
          {marker === "pillar_number" && cardLink && (
            <span className="font-body font-semibold" style={{ fontSize: 15, color: cardAccent || "hsl(var(--link))", marginTop: 14 }}>
              {card.cta_label?.trim() || `Explore ${card.title}`} <span aria-hidden>→</span>
            </span>
          )}

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
          </div>
        </>
      );

      // Clean, structured card enclosure: solid card surface, crisp
      // 1px border, uniform padding and a subtle shadow. `boxed-lift`
      // keeps the GPU-friendly hover transform (no icon shake).
      // When the row has a cover image, cards restyle as lighter,
      // smaller-radius tiles nested inside that photo-card container
      // — `surface-card`'s own border-radius (var(--radius), 1.5rem)
      // would look wrong repeated at the same size one level down.
      const cardClass = `${coverImage || isDarkCard ? "" : "surface-card"} text-left boxed-lift align-card flex flex-col ${cardLink ? "cursor-pointer" : ""}`;
      // Order matters: `border` is a shorthand that resets border-top, so
      // the accent's `borderTop` must come AFTER the cover-image block or
      // accent cards inside a cover-image row lose their top bar.
      const cardStyle = {
        ...revealStyle(isVisible, i + 2),
        padding: marker === "roman" ? 34 : 30,
        ["--slots" as string]: 4,
        ...(coverImage
          ? {
              backgroundColor: "hsl(var(--primary) / 0.045)",
              border: "1px solid hsl(var(--border))",
              borderRadius: "1rem",
            }
          : {}),
        ...(isDarkCard
          ? {
              backgroundColor: "hsl(var(--deep))",
              border: "1px solid hsl(var(--deep) / 0.9)",
              borderRadius: "var(--radius-card, 24px)",
              boxShadow: "var(--shadow-card)",
            }
          : {}),
        /* A card with a pillar (by link or key) or its own accent colour
           carries the thin coloured top border; dark bands never do. */
        ...(cardAccent && !isDarkCard ? { borderTop: `3px solid ${cardAccent}` } : {}),
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

    /* List layout (redesign §2.3, Services artboard): numbered rows —
       * pillar-coloured number tile, title + tier line, body, price and
       * an "Explore →" link, separated by hairlines. Stacks on phones. */
    const renderListItem = (card: BoxedCard, i: number) => {
      const cardLink: string | undefined = card.link_url?.trim() ? safeHref(card.link_url) : undefined;
      const pillarColor = pillarColorFromLink(cardLink) || pillarColorFromKey(card.pillar);
      const tileColor = pillarColor || card.accent_color?.trim() || "hsl(var(--primary))";
      const titleColor = "hsl(var(--row-heading))";
      const bodyColor = "var(--row-body)";
      const inner = (
        <>
          <span
            aria-hidden
            className="flex items-center justify-center font-display font-extrabold text-white"
            style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: tileColor, fontSize: 24 }}
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="flex flex-col gap-1.5 min-w-0">
            <span className="font-display font-bold leading-[1.1]" style={{ color: titleColor, fontSize: "var(--fs-list-title)" }}>{card.title}</span>
            {card.meta && (
              <span className="font-body font-semibold leading-[1.3]" style={{ fontSize: 13, letterSpacing: "0.04em", color: tileColor }}>{card.meta}</span>
            )}
          </span>
          <span
            className="rich-text font-body leading-[var(--lh-card-body)] min-w-0"
            style={{ color: bodyColor, fontSize: "var(--fs-card-body)" }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(card.body) }}
          />
          <span className="flex flex-col items-start md:items-end gap-1.5 leading-[1.2]">
            {card.price_note && card.price ? (
              <span className="font-body" style={{ fontSize: 12, color: bodyColor }}>{card.price_note}</span>
            ) : null}
            {card.price && (
              <span className="font-display font-bold" style={{ fontSize: 22, color: titleColor }}>{card.price}</span>
            )}
            {cardLink && (
              <span className="font-body font-semibold" style={{ fontSize: 15, color: tileColor }}>
                {card.cta_label || "Explore"} <span aria-hidden>→</span>
              </span>
            )}
          </span>
        </>
      );
      const itemClass = "grid grid-cols-1 md:grid-cols-[96px_minmax(0,1.2fr)_minmax(0,1.6fr)_220px] gap-4 md:gap-8 items-start md:items-center py-[34px] border-b row-border text-left";
      const itemStyle = revealStyle(isVisible, i + 2);
      if (cardLink) {
        return (
          <a key={i} href={cardLink} target={isExternal(cardLink) ? "_blank" : undefined} rel={isExternal(cardLink) ? "noopener noreferrer" : undefined}
            className={`${itemClass} block list-line-link`} style={{ ...itemStyle, textDecoration: "none", color: "inherit" }}>
            {inner}
          </a>
        );
      }
      return <div key={i} className={itemClass} style={itemStyle}>{inner}</div>;
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

        {/* A longer intro under the heading (Services index), on the
            heading block's own measure. */}
        {typeof c.intro === "string" && c.intro.replace(/<[^>]*>/g, "").trim() && (
          <div className="rich-text boxed-intro" data-row-part="body" style={revealStyle(isVisible, 1)} dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.intro) }} />
        )}

        {c.layout_mode === "list" ? (
          <div className={`border-t row-border ${headGap}`}>
            {cards.map((card, i) => renderListItem(card, i))}
          </div>
        ) : c.marker_style === "note" ? (
          /* A lone untitled card is a handwritten pull line (the note
             under the vows): centred script, no box. */
          <div className="text-center mx-auto" style={{ maxWidth: 900 }}>
            {cards.map((card, i) => (
              <div
                key={i}
                className="rich-text"
                style={{ fontFamily: "'Architects Daughter', cursive", fontSize: "clamp(18px, 1.5vw, 22px)", lineHeight: 1.4, color: "hsl(var(--link))", transform: "rotate(-1deg)" }}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(card.body) }}
              />
            ))}
          </div>
        ) : (
          <div className={`flex flex-col gap-6 ${headGap}`}>
            {/* Dark cards lead as full-width bands (the problem), with
                their title as the gold label and the body set large. */}
            {darkCards.map(({ card, i }) => (
              <article
                key={i}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 text-left"
                style={{ background: "hsl(var(--deep))", color: "hsl(var(--deep-fg))", borderRadius: 28, padding: "clamp(32px, 4vw, 52px)" }}
              >
                <EditableText sectionKey="page_rows" fieldPath={`${prefix}.cards.${i}.title`} as="p"
                  className="md:col-span-3 font-body font-bold uppercase"
                  style={{ fontSize: 12, letterSpacing: "0.28em", color: "hsl(var(--gold))", paddingTop: 6 }}>{card.title}</EditableText>
                <EditableText sectionKey="page_rows" fieldPath={`${prefix}.cards.${i}.body`} html as="div"
                  className="md:col-span-9 rich-text font-display"
                  style={{ fontSize: "clamp(18px, 1.7vw, 24px)", lineHeight: 1.45, fontWeight: 500, color: "hsl(var(--deep-fg))" } as React.CSSProperties}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(card.body) }} />
              </article>
            ))}
            {c.group_label && lightCards.length > 0 && (
              <p className="font-body font-bold uppercase" style={{ fontSize: 12, letterSpacing: "0.28em", color: "var(--row-eyebrow, hsl(var(--gold-text)))", marginTop: 8 }}>
                {c.group_label}
              </p>
            )}
            {lightCards.length > 0 && (
              <div className={`grid ${getGridCols(lightCards.length)} gap-6 items-stretch align-cards`}>
                {lightCards.map(({ card, i }) => renderCard(card, i))}
              </div>
            )}
          </div>
        )}


        {c.note && (
          <div className="mt-rhythm-base pt-3" style={{ ...revealStyle(isVisible, cards.length + 2), borderTop: "1px solid hsl(var(--foreground) / 0.1)" }}>
            <p
              className={c.note_handwritten ? "leading-[1.4]" : "font-body text-xs italic leading-[1.6]"}
              style={{
                color: c.note_handwritten && !c.color_note ? "hsl(var(--link))" : noteColor,
                ...(c.note_handwritten ? { fontFamily: "'Architects Daughter', cursive", fontSize: 20 } : {}),
              }}
            >{c.note}</p>
          </div>
        )}

        {c.cta_url && c.cta_label && (
          <div className="mt-rhythm-base" style={revealStyle(isVisible, cards.length + 3)}>
            <a href={safeHref(c.cta_url)} target={c.cta_url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
              className="btn-ink"
>
              {c.cta_label}
            </a>
          </div>
        )}

      </div>
    );
  };

  return (
    <RowSection
      row={row}
      vAlign={vAlign}
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
