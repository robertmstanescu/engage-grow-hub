import { motion } from "framer-motion";
import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/types/rows";
import { sanitizeHtml } from "@/lib/sanitize";
import EditableText from "@/components/admin/EditableText";
import SubscribeWidget from "@/components/SubscribeWidget";
import type { Alignment } from "./PageRows";

const ease = [0.16, 1, 0.3, 1] as const;
const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

const BoxedRow = ({ row, rowIndex, align = "left" }: { row: PageRow; rowIndex?: number; align?: Alignment }) => {
  const c = row.content;
  const prefix = rowIndex !== undefined ? `rows.${rowIndex}.content` : "";
  const titleLines: string[] = (c.title_lines || []).map((l: any) =>
    typeof l === "string" ? l.startsWith("<") ? l : `<p>${l}</p>` : `<p>${l}</p>`
  );
  const cards: { title: string; body: string }[] = c.cards || [];

  const getGridCols = (count: number) => {
    if (count <= 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-1 md:grid-cols-2";
    if (count === 3) return "grid-cols-1 md:grid-cols-3";
    if (count === 4) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
    return "grid-cols-1 md:grid-cols-3";
  };

  const l = { ...DEFAULT_ROW_LAYOUT, ...row.layout };
  const maxW = l.fullWidth ? "max-w-none" : "max-w-[1100px]";
  const alignClass = align === "center" ? "mx-auto text-center"
    : align === "right" ? "ml-auto mr-0 text-right"
    : "mr-auto ml-0 text-left";

  const gradStart = l.gradientStart || "hsl(280 55% 18% / 0.6)";
  const gradEnd = l.gradientEnd || "hsl(286 42% 20% / 0.4)";

  return (
    <section className="snap-section grain relative min-h-screen flex flex-col justify-center"
      style={{
        backgroundColor: row.bg_color || "hsl(var(--background))",
        isolation: "isolate",
        paddingTop: `${l.paddingTop}px`, paddingBottom: `${l.paddingBottom}px`,
        marginTop: l.marginTop ? `${l.marginTop}px` : undefined, marginBottom: l.marginBottom ? `${l.marginBottom}px` : undefined,
        ...(l.bgImage ? { backgroundImage: `url(${l.bgImage})`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
      }}>
      <div className="absolute inset-0 opacity-60" style={{
        background: `radial-gradient(ellipse 80% 60% at 10% 90%, ${gradStart}, transparent), radial-gradient(ellipse 60% 50% at 80% 20%, ${gradEnd}, transparent), radial-gradient(ellipse 50% 40% at 50% 50%, hsl(46 75% 60% / 0.04), transparent)`
      }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-10 blur-[150px]"
        style={{ background: "radial-gradient(circle, hsl(46 75% 60%), transparent)" }} />

      <div className={`relative z-10 ${maxW} px-6 ${alignClass}`}>
        {titleLines.length > 0 && (
          <motion.h3 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease }}
            className="font-display font-bold leading-tight mb-4" style={{ color: "hsl(var(--vows-title))", fontSize: "clamp(1.5rem, 4vw, 3rem)" }}>
            {titleLines.map((line, i) => (<span key={i}>{i > 0 && <br />}<span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} /></span>))}
          </motion.h3>
        )}

        {c.subtitle && (
          <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.05, ease }}>
            <EditableText sectionKey="page_rows" fieldPath={`${prefix}.subtitle`} as="p"
              className="leading-tight mb-10"
              style={{ fontFamily: "'Architects Daughter', cursive", color: c.subtitle_color || "hsl(var(--vows-title))", paddingTop: "10px", fontSize: "clamp(0.9rem, 2vw, 1.2rem)" }}>
              {c.subtitle}
            </EditableText>
          </motion.div>
        )}

        <div className={`grid ${getGridCols(cards.length)} gap-6 ${titleLines.length > 0 && !c.subtitle ? "mt-14" : "mt-4"}`}>
          {cards.slice(0, 6).map((card, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.12, ease }}
              className="rounded-xl p-7 text-left"
              style={{
                backgroundColor: "hsl(260 25% 12% / 0.5)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid hsl(280 20% 25% / 0.35)",
                boxShadow: "0 8px 40px -10px hsl(280 55% 15% / 0.4)",
              }}>
              <EditableText sectionKey="page_rows" fieldPath={`${prefix}.cards.${i}.title`} as="p"
                className="font-body-heading font-bold mb-3 text-lg" style={{ color: c.color_card_title || "hsl(var(--vows-card-title))" }}>{card.title}</EditableText>
              <EditableText sectionKey="page_rows" fieldPath={`${prefix}.cards.${i}.body`} html as="div"
                className="font-body text-xs leading-relaxed" style={{ color: "hsl(var(--vows-card-body))" }}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(card.body) }} />
            </motion.div>
          ))}
        </div>

        {c.show_subscribe && <div className="mt-10"><SubscribeWidget /></div>}
      </div>
    </section>
  );
};

export default BoxedRow;
