import { motion } from "framer-motion";
import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/types/rows";
import { sanitizeHtml } from "@/lib/sanitize";
import EditableText from "@/components/admin/EditableText";
import SubscribeWidget from "@/components/SubscribeWidget";

const ease = [0.16, 1, 0.3, 1] as const;
const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

const TextRow = ({ row, rowIndex }: { row: PageRow; rowIndex?: number }) => {
  const c = row.content;
  const prefix = rowIndex !== undefined ? `rows.${rowIndex}.content` : "";
  const titleLines: string[] = (c.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`
  );

  const l = { ...DEFAULT_ROW_LAYOUT, ...row.layout };
  const maxW = l.fullWidth ? "max-w-none" : "max-w-[800px]";

  // Determine if this is a light section based on bg_color
  const isLight = row.bg_color && (row.bg_color.includes("94%") || row.bg_color.includes("100%") || row.bg_color.includes("white"));

  return (
    <section className="snap-section" style={{
      backgroundColor: row.bg_color || "hsl(var(--background))",
      paddingTop: `${l.paddingTop}px`, paddingBottom: `${l.paddingBottom}px`,
      marginTop: l.marginTop ? `${l.marginTop}px` : undefined, marginBottom: l.marginBottom ? `${l.marginBottom}px` : undefined,
      ...(l.bgImage ? { backgroundImage: `url(${l.bgImage})`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
    }}>
      <div className={`${maxW} mx-auto px-8 lg:pl-24 text-center`}>
        {titleLines.length > 0 && (
          <motion.h3 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease }}
            className="font-display text-xl md:text-3xl font-bold leading-tight mb-3">
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
              className="font-body-heading text-base md:text-lg font-medium max-w-[700px] mx-auto leading-relaxed mt-5"
              style={{ opacity: 0.7 }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.body) }} />
          </motion.div>
        )}

        {c.show_subscribe && <SubscribeWidget className="mt-8" />}
      </div>
    </section>
  );
};

export default TextRow;
