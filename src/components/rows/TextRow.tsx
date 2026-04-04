import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/types/rows";
import { sanitizeHtml } from "@/lib/sanitize";
import EditableText from "@/components/admin/EditableText";
import SubscribeWidget from "@/components/SubscribeWidget";
import type { Alignment } from "./PageRows";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";

const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

const TextRow = ({ row, rowIndex, align = "left" }: { row: PageRow; rowIndex?: number; align?: Alignment }) => {
  const c = row.content;
  const prefix = rowIndex !== undefined ? `rows.${rowIndex}.content` : "";
  const titleLines: string[] = (c.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`
  );

  const l = { ...DEFAULT_ROW_LAYOUT, ...row.layout };
  const maxW = l.fullWidth ? "max-w-none" : "max-w-[800px]";
  const isLight = row.bg_color && (row.bg_color.includes("94%") || row.bg_color.includes("100%") || row.bg_color.includes("white") || row.bg_color.includes("#F") || row.bg_color.includes("#f"));

  const alignClass = align === "center" ? "mx-auto text-center"
    : align === "right" ? "ml-auto mr-0 text-right"
    : "mr-auto ml-0 text-left";

  const gradStart = l.gradientStart || (isLight ? "hsl(280 55% 24% / 0.2)" : "hsl(280 55% 18% / 0.5)");
  const gradEnd = l.gradientEnd || (isLight ? "hsl(286 42% 30% / 0.15)" : "hsl(286 42% 20% / 0.3)");

  const noteColor = c.color_note || (isLight ? "hsl(var(--light-fg) / 0.5)" : "hsl(var(--foreground) / 0.5)");

  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="snap-section relative min-h-screen flex flex-col justify-center" style={{
      backgroundColor: row.bg_color || "hsl(var(--background))",
      isolation: "isolate",
      paddingTop: "24px", paddingBottom: "24px",
      ...(l.bgImage ? { backgroundImage: `url(${l.bgImage})`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
    }}>
      <div className="absolute inset-0 opacity-40 blur-[100px]" style={{
        background: `radial-gradient(ellipse 80% 60% at 30% 70%, ${gradStart}, transparent), radial-gradient(ellipse 60% 40% at 70% 30%, ${gradEnd}, transparent)`
      }} />

      <div ref={ref} className={`relative z-10 ${maxW} px-6 ${alignClass}`}>
        {c.eyebrow && (
          <span className="font-body tracking-[0.35em] uppercase block mb-3" style={{ ...revealStyle(isVisible, -0.5), fontSize: "clamp(7px, 0.9vw, 10px)", color: c.color_eyebrow || (isLight ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.5)") }}>
            <EditableText sectionKey="page_rows" fieldPath={`${prefix}.eyebrow`} as="span">{c.eyebrow}</EditableText>
          </span>
        )}

        {titleLines.length > 0 && (
          <h3 className="font-display font-bold leading-tight mb-3"
            style={{ ...revealStyle(isVisible, 0), color: isLight ? "hsl(var(--primary))" : "hsl(var(--foreground))", fontSize: "clamp(1.25rem, 3vw, 2rem)" }}>
            {titleLines.map((line, i) => (<span key={i}>{i > 0 && <br />}<span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} /></span>))}
          </h3>
        )}

        {c.subtitle && (
          <div style={revealStyle(isVisible, 1)}>
            <EditableText sectionKey="page_rows" fieldPath={`${prefix}.subtitle`} as="p"
              className="leading-tight"
              style={{ fontFamily: "'Architects Daughter', cursive", color: c.subtitle_color || "inherit", paddingTop: "10px", fontSize: "clamp(0.9rem, 2vw, 1.2rem)" }}>
              {c.subtitle}
            </EditableText>
          </div>
        )}

        {c.body && (
          <div style={revealStyle(isVisible, 2)}>
            <EditableText sectionKey="page_rows" fieldPath={`${prefix}.body`} html as="div"
              className={`font-body-heading font-medium max-w-[700px] leading-relaxed mt-5 [&_p]:mb-[5px] [&_p]:mt-[5px] ${align === "right" ? "ml-auto" : align === "center" ? "mx-auto" : ""}`}
              style={{ color: isLight ? "hsl(var(--light-fg) / 0.75)" : "hsl(var(--foreground) / 0.7)", fontSize: "clamp(0.85rem, 1.8vw, 1.15rem)" }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.body) }} />
          </div>
        )}

        {c.note && (
          <div className="mt-4 pt-3" style={{ ...revealStyle(isVisible, 2.5), borderTop: "1px solid hsl(var(--foreground) / 0.1)" }}>
            <p className="font-body text-xs italic leading-relaxed" style={{ color: noteColor }}>{c.note}</p>
          </div>
        )}

        {c.cta_url && c.cta_label && (
          <div className="mt-5" style={revealStyle(isVisible, 3)}>
            <a href={c.cta_url} target={c.cta_url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
              className="btn-glass font-display text-[10px] uppercase tracking-[0.1em] font-bold px-6 py-3 rounded-full transition-all duration-500 hover:opacity-85 inline-block"
              style={{ backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--primary-foreground))" }}>
              {c.cta_label}
            </a>
          </div>
        )}

        {c.show_subscribe && <div style={revealStyle(isVisible, 3)}><SubscribeWidget className="mt-8" align={align} /></div>}
      </div>
    </section>
  );
};

export default TextRow;
