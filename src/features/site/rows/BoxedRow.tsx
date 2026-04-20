import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT, getRowColumns, multiColGridStyle } from "@/types/rows";
import { sanitizeHtml } from "@/services/sanitize";
import EditableText from "@/features/admin/EditableText";
import SubscribeWidget from "@/features/site/SubscribeWidget";
import type { Alignment, VAlign } from "./PageRows";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import { useAutoFitText } from "@/hooks/useAutoFitText";
import { RowEyebrow, RowTitle, RowSubtitle, RowSection } from "./typography";

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
    if (count === 3) return "grid-cols-1 md:grid-cols-3";
    if (count === 4) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
    return "grid-cols-1 md:grid-cols-3";
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
          <RowEyebrow color={c.color_eyebrow || "hsl(var(--vows-title) / 0.6)"} style={revealStyle(isVisible, -0.5)}>
            <EditableText sectionKey="page_rows" fieldPath={`${prefix}.eyebrow`} as="span">{c.eyebrow}</EditableText>
          </RowEyebrow>
        )}

        {titleLines.length > 0 && (
          <RowTitle color={c.color_title || "hsl(var(--vows-title))"} style={revealStyle(isVisible, 0)}>
            {titleLines.map((line, i) => (<span key={i}>{i > 0 && <br />}<span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} /></span>))}
          </RowTitle>
        )}

        {c.subtitle && (
          <RowSubtitle color={c.subtitle_color || "hsl(var(--vows-title))"} style={revealStyle(isVisible, 1)}>
            <EditableText sectionKey="page_rows" fieldPath={`${prefix}.subtitle`} as="span">{c.subtitle}</EditableText>
          </RowSubtitle>
        )}

        <div className={`grid ${getGridCols(cards.length)} gap-6 ${titleLines.length > 0 && !c.subtitle ? "mt-rhythm-loose" : "mt-rhythm-base"}`}>
          {cards.slice(0, 6).map((card, i) => (
            <div key={i}
              className="rounded-xl p-7 text-left"
              style={{
                ...revealStyle(isVisible, i + 2),
                // Apple Vibrancy: barely-there tint, heavy blur+saturation, faint inner highlight.
                backgroundColor: "hsl(260 25% 12% / 0.2)",
                backdropFilter: "blur(32px) saturate(180%)",
                WebkitBackdropFilter: "blur(32px) saturate(180%)",
                border: "1px solid hsl(280 20% 25% / 0.15)",
                boxShadow: "0 8px 40px -10px hsl(280 55% 15% / 0.4), inset 0 1px 1px hsl(0 0% 100% / 0.1)",
              }}>
              <EditableText sectionKey="page_rows" fieldPath={`${prefix}.cards.${i}.title`} as="p"
                className="font-body-heading font-bold mb-3 text-lg leading-[1.6]" style={{ color: c.color_card_title || "hsl(var(--vows-card-title))" }}>{card.title}</EditableText>
              <EditableText sectionKey="page_rows" fieldPath={`${prefix}.cards.${i}.body`} html as="div"
                data-rte-fit=""
                className="font-body text-xs leading-[1.6] [&_p]:mb-[5px] [&_p]:mt-[5px]" style={{ color: c.color_card_body || "hsl(var(--vows-card-body))", overflow: "visible", height: "auto" }}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(card.body) }} />
            </div>
          ))}
        </div>

        {c.note && (
          <div className="mt-rhythm-base pt-3" style={{ ...revealStyle(isVisible, cards.length + 2), borderTop: "1px solid hsl(var(--foreground) / 0.1)" }}>
            <p className="font-body text-xs italic leading-[1.6]" style={{ color: noteColor }}>{c.note}</p>
          </div>
        )}

        {c.cta_url && c.cta_label && (
          <div className="mt-rhythm-base" style={revealStyle(isVisible, cards.length + 3)}>
            <a href={c.cta_url} target={c.cta_url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
              className="btn-glass interactive font-display text-[10px] uppercase tracking-[0.1em] font-bold px-6 py-3 rounded-full inline-block"
              style={{ backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--primary-foreground))" }}>
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

      <div ref={ref} className={`relative z-10 px-6 ${isMultiCol ? `${l.fullWidth ? "" : "max-w-[1200px]"} ${containerPos}` : `${maxW} ${containerPos} ${contentAlign}`}`}>
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
