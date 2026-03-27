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
      className="snap-section grain relative min-h-screen flex flex-col justify-end overflow-hidden mesh-hero">
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

      {/* Ambient glow */}
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
        style={{ background: "radial-gradient(circle, hsl(280 55% 30%), transparent)" }} />

      <div className="relative z-10 w-full max-w-[1100px] mx-auto pl-8 lg:pl-24 pr-8 pb-24 md:pb-32 pt-44">
        {c.label && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2, ease }}
            className="font-body text-[10px] tracking-[0.35em] uppercase mb-10"
            style={{ color: c.label_color || "hsl(var(--hero-label))" }}>
            {c.label}
          </motion.p>
        )}

        {titleLines.length > 0 && (
          <h1 className="font-display text-4xl md:text-6xl lg:text-[5rem] xl:text-[6rem] font-black leading-[0.92] tracking-tight mb-0 max-w-[950px]"
            style={{ color: c.title_color || "hsl(var(--hero-title))" }}>
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
            className="font-body text-[10px] tracking-[0.3em] uppercase mt-8"
            style={{ color: c.tagline_color || "hsl(var(--hero-label))" }}>
            {c.tagline}
          </motion.p>
        )}

        {c.subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1, ease }}
            className="text-lg md:text-xl leading-tight mt-6 max-w-[550px]"
            style={{ fontFamily: "'Architects Daughter', cursive", color: c.subtitle_color || "hsl(var(--hero-body))" }}>
            {c.subtitle}
          </motion.p>
        )}

        {c.body && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1, ease }}
            className="font-body-heading text-base md:text-lg max-w-[480px] leading-relaxed mt-8"
            style={{ color: c.body_color || "hsl(var(--hero-body))", opacity: 0.75 }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.body) }}
          />
        )}
      </div>
    </section>
  );
};

export default HeroRow;
