import { motion } from "framer-motion";
import { sanitizeHtml } from "@/lib/sanitize";
import type { PageRow } from "@/types/rows";

const ease = [0.16, 1, 0.3, 1] as const;
const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

interface Props {
  row: PageRow;
}

const HeroRow = ({ row }: Props) => {
  const c = row.content;
  const titleLines: string[] = (c.title_lines || []).map((line: any) =>
    typeof line === "string" ? (line.startsWith("<") ? line : `<p>${line}</p>`) : `<p>${line}</p>`
  );

  const bgType = c.bg_type || "none";
  const bgUrl = c.bg_url || "";
  const hasBg = bgType !== "none" && bgUrl;

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden"
      style={{ backgroundColor: row.bg_color || "hsl(var(--hero-bg))" }}>
      {hasBg && bgType === "image" && (
        <div className="absolute inset-0 z-0">
          <img src={bgUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}
      {hasBg && bgType === "video" && (
        <div className="absolute inset-0 z-0">
          <video src={bgUrl} autoPlay muted loop playsInline className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}

      <div className="relative z-10 max-w-[800px] mx-auto px-6">
        {c.label && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="font-body text-[11px] tracking-[0.2em] uppercase mb-6"
            style={{ color: c.label_color || "hsl(var(--hero-label))" }}>
            {c.label}
          </motion.p>
        )}

        {titleLines.length > 0 && (
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
            className="font-display text-3xl md:text-5xl lg:text-[3.5rem] font-black leading-[1.05] mb-0"
            style={{ color: c.title_color || "hsl(var(--hero-title))" }}>
            {titleLines.map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} />{" "}
              </span>
            ))}
          </motion.h1>
        )}

        {c.subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease }}
            className="text-lg md:text-xl leading-tight mt-3"
            style={{
              fontFamily: "'Architects Daughter', cursive",
              color: c.subtitle_color || "hsl(var(--hero-body))",
              paddingTop: "10px",
            }}>
            {c.subtitle}
          </motion.p>
        )}

        {c.body && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease }}
            className="font-body-heading text-lg max-w-[620px] mx-auto leading-relaxed mt-6"
            style={{ color: c.body_color || "hsl(var(--hero-body))" }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.body) }}
          />
        )}
      </div>
    </section>
  );
};

export default HeroRow;
