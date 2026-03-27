import { motion } from "framer-motion";
import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/types/rows";
import { sanitizeHtml } from "@/lib/sanitize";
import EditableText from "@/components/admin/EditableText";
import SubscribeWidget from "@/components/SubscribeWidget";

const ease = [0.16, 1, 0.3, 1] as const;
const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

const BoxedRow = ({ row, rowIndex }: { row: PageRow; rowIndex?: number }) => {
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
    if (count === 5) return "grid-cols-1 md:grid-cols-3 lg:grid-cols-5";
    return "grid-cols-1 md:grid-cols-3 lg:grid-cols-6";
  };

  const l = { ...DEFAULT_ROW_LAYOUT, ...row.layout };
  const maxW = l.fullWidth ? "max-w-none" : "max-w-[1100px]";

  return (
    <section
      className="grain-overlay"
      style={{
        backgroundColor: row.bg_color || "hsl(var(--vows-bg))",
        paddingTop: `${l.paddingTop}px`,
        paddingBottom: `${l.paddingBottom}px`,
        marginTop: l.marginTop ? `${l.marginTop}px` : undefined,
        marginBottom: l.marginBottom ? `${l.marginBottom}px` : undefined,
        ...(l.bgImage ? { backgroundImage: `url(${l.bgImage})`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
      }}>
      <div className={`relative z-10 ${maxW} mx-auto px-8 md:px-12 text-center`}>
        {/* Ornamental divider */}
        <div className="ornamental-divider mb-12">
          <span className="ornament">✦</span>
        </div>

        {titleLines.length > 0 && (
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease }}
            className="font-display text-xl md:text-3xl lg:text-4xl font-bold leading-tight mb-3"
            style={{ color: "hsl(var(--vows-title))" }}>
            {titleLines.map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} />
              </span>
            ))}
          </motion.h3>
        )}

        {c.subtitle && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.05, ease }}>
            <EditableText
              sectionKey="page_rows"
              fieldPath={`${prefix}.subtitle`}
              as="p"
              className="text-base md:text-lg leading-tight mb-8"
              style={{
                fontFamily: "'Architects Daughter', cursive",
                color: c.subtitle_color || "hsl(var(--vows-title))",
                paddingTop: "10px",
              }}>
              {c.subtitle}
            </EditableText>
          </motion.div>
        )}

        <div className={`grid ${getGridCols(cards.length)} gap-6 md:gap-8 ${titleLines.length > 0 && !c.subtitle ? "mt-12" : "mt-4"}`}>
          {cards.slice(0, 6).map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.12, ease }}
              className="rounded-lg p-6 md:p-7 text-left"
              style={{ border: "1px solid hsl(var(--vows-card-border) / 0.2)" }}>
              <EditableText
                sectionKey="page_rows"
                fieldPath={`${prefix}.cards.${i}.title`}
                as="p"
                className="font-body-heading font-bold mb-2 text-lg text-accent"
                style={{ color: "hsl(var(--vows-card-title))" }}>
                {card.title}
              </EditableText>
              <EditableText
                sectionKey="page_rows"
                fieldPath={`${prefix}.cards.${i}.body`}
                html
                as="div"
                className="font-body text-xs leading-relaxed"
                style={{ color: "hsl(var(--vows-card-body))", opacity: 0.85 }}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(card.body) }}
              />
            </motion.div>
          ))}
        </div>

        {c.show_subscribe && (
          <div className="mt-10">
            <SubscribeWidget />
          </div>
        )}
      </div>
    </section>
  );
};

export default BoxedRow;
