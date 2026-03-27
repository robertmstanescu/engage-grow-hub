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

  const alignClass = align === "center" ? "mx-auto text-center"
    : align === "right" ? "ml-auto mr-0 text-right"
    : "mr-auto ml-0 text-left";

  const gradStart = l.gradientStart || (isLight ? "hsl(280 55% 24% / 0.2)" : "hsl(280 55% 18% / 0.5)");
  const gradEnd = l.gradientEnd || (isLight ? "hsl(286 42% 30% / 0.15)" : "hsl(286 42% 20% / 0.3)");

  return (
    <section className="snap-section relative min-h-screen flex flex-col justify-center" style={{
      backgroundColor: row.bg_color || "hsl(var(--background))",
      paddingTop: `${l.paddingTop}px`, paddingBottom: `${l.paddingBottom}px`,
      marginTop: l.marginTop ? `${l.marginTop}px` : undefined, marginBottom: l.marginBottom ? `${l.marginBottom}px` : undefined,
      ...(l.bgImage ? { backgroundImage: `url(${l.bgImage})`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
    }}>
      <div className="absolute inset-0 opacity-40 blur-[100px]" style={{
        background: `radial-gradient(ellipse 80% 60% at 30% 70%, ${gradStart}, transparent), radial-gradient(ellipse 60% 40% at 70% 30%, ${gradEnd}, transparent)`
      }} />

      <div className={`relative z-10 ${maxW} px-6 ${alignClass}`}>
        {titleLines.length > 0 && (
          <motion.h3 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease }}
            className="font-display font-bold leading-tight mb-3"
            style={{ color: isLight ? "hsl(var(--primary))" : "hsl(var(--foreground))", fontSize: "clamp(1.25rem, 3vw, 2rem)" }}>
            {titleLines.map((line, i) => (<span key={i}>{i > 0 && <br />}<span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} /></span>))}
          </motion.h3>
        )}

        {c.subtitle && (
          <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.05, ease }}>
            <EditableText sectionKey="page_rows" fieldPath={`${prefix}.subtitle`} as="p"
              className="leading-tight"
              style={{ fontFamily: "'Architects Daughter', cursive", color: c.subtitle_color || "inherit", paddingTop: "10px", fontSize: "clamp(0.9rem, 2vw, 1.2rem)" }}>
              {c.subtitle}
            </EditableText>
          </motion.div>
        )}

        {c.body && (
          <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.1, ease }}>
            <EditableText sectionKey="page_rows" fieldPath={`${prefix}.body`} html as="div"
              className={`font-body-heading font-medium max-w-[700px] leading-relaxed mt-5 ${align === "right" ? "ml-auto" : align === "center" ? "mx-auto" : ""}`}
              style={{ color: isLight ? "hsl(var(--light-fg) / 0.75)" : "hsl(var(--foreground) / 0.7)", fontSize: "clamp(0.85rem, 1.8vw, 1.15rem)" }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.body) }} />
          </motion.div>
        )}

        {c.show_subscribe && <SubscribeWidget className="mt-8" />}
      </div>
    </section>
  );
};

export default TextRow;
