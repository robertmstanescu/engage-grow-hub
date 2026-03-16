import { motion } from "framer-motion";
import type { PageRow } from "@/types/rows";

const ease = [0.16, 1, 0.3, 1] as const;
const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

const BoxedRow = ({ row }: { row: PageRow }) => {
  const c = row.content;
  const titleLines: string[] = (c.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`
  );
  const cards: { title: string; body: string }[] = c.cards || [];

  return (
    <section
      className={row.scope || ""}
      style={{ backgroundColor: row.bg_color || "hsl(var(--vows-bg))" }}>
      <div className="max-w-[800px] mx-auto px-6 py-20 text-center">
        {titleLines.length > 0 && (
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
            className="font-display text-xl md:text-2xl font-bold leading-tight mb-2"
            style={{ color: "hsl(var(--vows-title))" }}>
            {titleLines.map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                <span dangerouslySetInnerHTML={{ __html: stripP(line) }} />
              </span>
            ))}
          </motion.h3>
        )}

        {c.subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.05, ease }}
            className="text-base md:text-lg leading-tight mb-6"
            style={{
              fontFamily: "'Architects Daughter', cursive",
              color: c.subtitle_color || "hsl(var(--vows-title))",
              paddingTop: "10px",
            }}>
            {c.subtitle}
          </motion.p>
        )}

        <div className={`grid grid-cols-1 ${cards.length >= 2 ? "md:grid-cols-2" : ""} ${cards.length >= 3 ? "md:grid-cols-3" : ""} gap-5 ${titleLines.length > 0 && !c.subtitle ? "mt-10" : "mt-4"}`}>
          {cards.slice(0, 3).map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1, ease }}
              className="rounded-lg p-5 text-left"
              style={{ border: "1px solid hsl(var(--vows-card-border) / 0.25)" }}>
              <p
                className="font-body-heading text-sm font-bold mb-1.5"
                style={{ color: "hsl(var(--vows-card-title))" }}>
                {card.title}
              </p>
              <div
                className="font-body text-xs leading-relaxed"
                style={{ color: "hsl(var(--vows-card-body))" }}
                dangerouslySetInnerHTML={{ __html: card.body }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BoxedRow;
