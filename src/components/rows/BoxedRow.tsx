import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT, getRowColumns, multiColGridStyle } from "@/types/rows";
import { sanitizeHtml } from "@/lib/sanitize";
import EditableText from "@/components/admin/EditableText";
import SubscribeWidget from "@/components/SubscribeWidget";
import type { Alignment, VAlign } from "./PageRows";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import { useAutoFitText } from "@/hooks/useAutoFitText";
import { getRowBackgroundCSS, ROW_GRADIENT_DEFAULTS } from "./rowBackground";

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

  const bgCss = getRowBackgroundCSS(
    row,
    (gs, ge) => `radial-gradient(ellipse 80% 60% at 10% 90%, ${gs}, transparent), radial-gradient(ellipse 60% 50% at 80% 20%, ${ge}, transparent), radial-gradient(ellipse 50% 40% at 50% 50%, hsl(46 75% 60% / 0.04), transparent)`,
    ROW_GRADIENT_DEFAULTS.boxed,
  );

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
          <span className="font-body tracking-[0.35em] uppercase block mb-3" style={{ ...revealStyle(isVisible, -0.5), fontSize: "clamp(7px, 0.9vw, 10px)", color: c.color_eyebrow || "hsl(var(--vows-title) / 0.6)" }}>
            <EditableText sectionKey="page_rows" fieldPath={`${prefix}.eyebrow`} as="span">{c.eyebrow}</EditableText>
          </span>
        )}

        {titleLines.length > 0 && (
          <h3 className="font-display font-bold leading-tight mb-4"
            style={{ ...revealStyle(isVisible, 0), color: c.color_title || "hsl(var(--vows-title))", fontSize: "clamp(1.5rem, 4vw, 3rem)" }}>
            {titleLines.map((line, i) => (<span key={i}>{i > 0 && <br />}<span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} /></span>))}
          </h3>
        )}

        {c.subtitle && (
          <div style={revealStyle(isVisible, 1)}>
            <EditableText sectionKey="page_rows" fieldPath={`${prefix}.subtitle`} as="p"
              className="leading-tight mb-10"
              style={{ fontFamily: "'Architects Daughter', cursive", color: c.subtitle_color || "hsl(var(--vows-title))", paddingTop: "10px", fontSize: "clamp(0.9rem, 2vw, 1.2rem)" }}>
              {c.subtitle}
            </EditableText>
          </div>
        )}

        <div className={`grid ${getGridCols(cards.length)} gap-6 ${titleLines.length > 0 && !c.subtitle ? "mt-14" : "mt-4"}`}>
          {cards.slice(0, 6).map((card, i) => (
            <div key={i}
              className="rounded-xl p-7 text-left"
              style={{
                ...revealStyle(isVisible, i + 2),
                backgroundColor: "hsl(260 25% 12% / 0.5)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid hsl(280 20% 25% / 0.35)",
                boxShadow: "0 8px 40px -10px hsl(280 55% 15% / 0.4)",
              }}>
              <EditableText sectionKey="page_rows" fieldPath={`${prefix}.cards.${i}.title`} as="p"
                className="font-body-heading font-bold mb-3 text-lg" style={{ color: c.color_card_title || "hsl(var(--vows-card-title))" }}>{card.title}</EditableText>
              <EditableText sectionKey="page_rows" fieldPath={`${prefix}.cards.${i}.body`} html as="div"
                data-rte-fit=""
                className="font-body text-xs leading-relaxed [&_p]:mb-[5px] [&_p]:mt-[5px]" style={{ color: c.color_card_body || "hsl(var(--vows-card-body))", overflow: "visible", height: "auto" }}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(card.body) }} />
            </div>
          ))}
        </div>

        {c.note && (
          <div className="mt-6 pt-3" style={{ ...revealStyle(isVisible, cards.length + 2), borderTop: "1px solid hsl(var(--foreground) / 0.1)" }}>
            <p className="font-body text-xs italic leading-relaxed" style={{ color: noteColor }}>{c.note}</p>
          </div>
        )}

        {c.cta_url && c.cta_label && (
          <div className="mt-6" style={revealStyle(isVisible, cards.length + 3)}>
            <a href={c.cta_url} target={c.cta_url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
              className="btn-glass font-display text-[10px] uppercase tracking-[0.1em] font-bold px-6 py-3 rounded-full transition-all duration-500 hover:opacity-85 inline-block"
              style={{ backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--primary-foreground))" }}>
              {c.cta_label}
            </a>
          </div>
        )}

        {c.show_subscribe && <div className="mt-10" style={revealStyle(isVisible, cards.length + 2)}><SubscribeWidget align={align} /></div>}
      </div>
    );
  };

  return (
    <section ref={(el) => { autoFitRef.current = el; }} className={`snap-section grain relative min-h-screen flex flex-col ${vAlign === "top" ? "justify-start" : vAlign === "bottom" ? "justify-end" : "justify-center"}`}
      style={{
        backgroundColor: row.bg_color || "hsl(var(--background))",
        isolation: "isolate",
        paddingTop: "24px", paddingBottom: "24px",
        ...(l.bgImage ? { backgroundImage: `url(${l.bgImage})`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
      }}>
      <div className="absolute inset-0 opacity-60" style={{ background: bgCss }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-10 blur-[150px]"
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
    </section>
  );
};

export default BoxedRow;
