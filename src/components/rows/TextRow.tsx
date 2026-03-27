import { motion } from "framer-motion";
import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/types/rows";
import { sanitizeHtml } from "@/lib/sanitize";
import EditableText from "@/components/admin/EditableText";
import SubscribeWidget from "@/components/SubscribeWidget";
import type { Alignment } from "./PageRows";

const ease = [0.16, 1, 0.3, 1] as const;
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

  const alignClass = align === "right" ? "ml-auto mr-0 text-right" : "mr-auto ml-0 text-left";

  return (
    <section className="snap-section relative" style={{
      backgroundColor: row.bg_color || "hsl(var(--background))",
      paddingTop: `${l.paddingTop}px`, paddingBottom: `${l.paddingBottom}px`,
      marginTop: l.marginTop ? `${l.marginTop}px` : undefined, marginBottom: l.marginBottom ? `${l.marginBottom}px` : undefined,
      ...(l.bgImage ? { backgroundImage: `url(${l.bgImage})`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
    }}>
      {isLight ? (
        <div className="absolute inset-0 opacity-30 blur-[100px]" style={{ background: "radial-gradient(ellipse 80% 60% at 30% 70%, hsl(280 55% 24% / 0.2), transparent), radial-gradient(ellipse 60% 40% at 70% 30%, hsl(286 42% 30% / 0.15), transparent)" }} />
      ) : (
        <div className="absolute inset-0 opacity-50" style={{ background: "radial-gradient(ellipse 80% 60% at 10% 90%, hsl(280 55% 18% / 0.5), transparent), radial-gradient(ellipse 60% 50% at 80% 20%, hsl(286 42% 20% / 0.3), transparent)" }} />
      )}

      <div className={`relative z-10 ${maxW} px-3 ${alignClass}`}>
        {titleLines.length > 0 && (
          <motion.h3 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease }}
            className="font-display text-xl md:text-3xl font-bold leading-tight mb-3"
            style={{ color: isLight ? "hsl(var(--primary))" : "hsl(var(--foreground))" }}>
            {titleLines.map((line, i) => (<span key={i}>{i > 0 && <br />}<span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} /></span>))}
          </motion.h3>
        )}

        {c.subtitle && (
          <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.05, ease }}>
            <EditableText sectionKey="page_rows" fieldPath={`${prefix}.subtitle`} as="p"
              className="text-base md:text-lg leading-tight"
              style={{ fontFamily: "'Architects Daughter', cursive", color: c.subtitle_color || "inherit", paddingTop: "10px" }}>
              {c.subtitle}
            </EditableText>
          </motion.div>
        )}

        {c.body && (
          <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.1, ease }}>
            <EditableText sectionKey="page_rows" fieldPath={`${prefix}.body`} html as="div"
              className={`font-body-heading text-base md:text-lg font-medium max-w-[700px] leading-relaxed mt-5 ${align === "right" ? "ml-auto" : ""}`}
              style={{ color: isLight ? "hsl(var(--light-fg) / 0.75)" : "hsl(var(--foreground) / 0.7)" }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.body) }} />
          </motion.div>
        )}

        {c.show_subscribe && <SubscribeWidget className="mt-8" />}
      </div>
    </section>
  );
};

export default TextRow;
