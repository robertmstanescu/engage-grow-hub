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
      className="grain-overlay relative min-h-screen flex flex-col justify-end overflow-hidden"
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

      <div className="relative z-10 w-full max-w-[1100px] mx-auto px-8 md:px-12 pb-20 md:pb-28 pt-40">
        {c.label && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease }}
            className="font-body text-[10px] tracking-[0.3em] uppercase mb-8"
            style={{ color: c.label_color || "hsl(var(--hero-label))" }}>
            {c.label}
          </motion.p>
        )}

        {titleLines.length > 0 && (
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="font-display text-4xl md:text-6xl lg:text-[4.5rem] xl:text-[5.5rem] font-black leading-[0.95] tracking-tight mb-0 max-w-[900px]"
            style={{ color: c.title_color || "hsl(var(--hero-title))" }}>
            {titleLines.map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} />{" "}
              </span>
            ))}
          </motion.h1>
        )}

        {c.tagline && (
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease }}
            className="font-body text-[10px] tracking-[0.25em] uppercase mt-6 mb-0"
            style={{ color: c.tagline_color || "hsl(var(--hero-label))", opacity: 0.6 }}>
            {c.tagline}
          </motion.p>
        )}

        {c.subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease }}
            className="text-lg md:text-xl leading-tight mt-5 max-w-[600px]"
            style={{
              fontFamily: "'Architects Daughter', cursive",
              color: c.subtitle_color || "hsl(var(--hero-body))",
            }}>
            {c.subtitle}
          </motion.p>
        )}

        {c.body && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease }}
            className="font-body-heading text-base md:text-lg max-w-[520px] leading-relaxed mt-8"
            style={{ color: c.body_color || "hsl(var(--hero-body))", opacity: 0.85 }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.body) }}
          />
        )}
      </div>
    </section>
  );
};

export default HeroRow;
