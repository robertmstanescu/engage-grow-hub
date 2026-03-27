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
    <section className="snap-section grain relative h-screen flex flex-col justify-end overflow-hidden mesh-hero">
      {hasBg && bgType === "image" && (
        <div className="absolute inset-0 z-0">
          <img src={bgUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}
      {hasBg && bgType === "video" && (
        <div className="absolute inset-0 z-0">
          <video src={bgUrl} autoPlay muted loop playsInline className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}

      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
        style={{ background: "radial-gradient(circle, hsl(280 55% 30%), transparent)" }} />

      <div className="relative z-10 w-full max-w-[1100px] px-3 pb-[4vh] pt-[15vh] flex flex-col justify-end">
        {c.label && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2, ease }}
            className="font-body tracking-[0.35em] uppercase mb-[2vh]"
            style={{ color: c.label_color || "hsl(var(--hero-label))", fontSize: "clamp(8px, 1vw, 11px)" }}>
            {c.label}
          </motion.p>
        )}

        {titleLines.length > 0 && (
          <h1 className="font-display font-black leading-[0.92] tracking-tight mb-0 max-w-[95%]"
            style={{ color: c.title_color || "hsl(var(--hero-title))", fontSize: "clamp(2rem, 6.5vw, 6rem)" }}>
            {titleLines.map((line, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 + i * 0.12, ease }}
                className="block">
                <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} />
              </motion.span>
            ))}
          </h1>
        )}

        {c.tagline && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ duration: 1, delay: 0.8, ease }}
            className="font-body tracking-[0.3em] uppercase mt-[2vh]"
            style={{ color: c.tagline_color || "hsl(var(--hero-label))", fontSize: "clamp(8px, 1vw, 11px)" }}>
            {c.tagline}
          </motion.p>
        )}

        {c.subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1, ease }}
            className="leading-tight mt-[1.5vh] max-w-[550px]"
            style={{ fontFamily: "'Architects Daughter', cursive", color: c.subtitle_color || "hsl(var(--hero-body))", fontSize: "clamp(0.9rem, 2vw, 1.25rem)" }}>
            {c.subtitle}
          </motion.p>
        )}

        {c.body && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1, ease }}
            className="font-body-heading max-w-[480px] leading-relaxed mt-[2vh]"
            style={{ color: c.body_color || "hsl(var(--hero-body))", opacity: 0.75, fontSize: "clamp(0.8rem, 1.5vw, 1.1rem)" }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.body) }}
          />
        )}
      </div>
    </section>
  );
};

export default HeroRow;
