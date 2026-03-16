import { motion } from "framer-motion";
import type { PageRow } from "@/types/rows";

const ease = [0.16, 1, 0.3, 1] as const;
const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

const TextRow = ({ row }: { row: PageRow }) => {
  const c = row.content;
  const titleLines: string[] = (c.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`
  );

  return (
    <section style={{ backgroundColor: row.bg_color || "hsl(var(--background))" }}>
      <div className="max-w-[800px] mx-auto px-6 py-16 text-center">
        {titleLines.length > 0 && (
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
            className="font-display text-xl md:text-2xl font-bold leading-tight mb-2">
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
            className="text-base md:text-lg leading-tight"
            style={{
              fontFamily: "'Architects Daughter', cursive",
              color: c.subtitle_color || "inherit",
              paddingTop: "10px",
            }}>
            {c.subtitle}
          </motion.p>
        )}

        {c.body && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
            className="font-body-heading text-base font-medium max-w-[700px] mx-auto leading-relaxed mt-4"
            dangerouslySetInnerHTML={{ __html: c.body }}
          />
        )}
      </div>
    </section>
  );
};

export default TextRow;
