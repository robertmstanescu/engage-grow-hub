import { motion } from "framer-motion";
import { useSiteContent } from "@/hooks/useSiteContent";

const ease = [0.16, 1, 0.3, 1] as const;

interface HeroContent {
  label: string;
  title_lines?: any[];
  subtitle?: string;
  body: string;
  bg_type?: "none" | "image" | "video";
  bg_url?: string;
  // legacy
  title_line1?: string;
  title_accent?: string;
  title_line2?: string;
}

const fallback: HeroContent = {
  label: "What we do",
  title_lines: [
    "<p>Your organisation has</p>",
    '<p><span style="color: #E5C54F">vampires.</span></p>',
    "<p>We bring the coffin.</p>",
  ],
  body: "Dead meetings. Blood-sucking cultures. Communications that say everything while meaning nothing. We bury all of it — and build something with an actual pulse in its place.",
};

/** Strip <p> wrappers so content renders inline inside h1 */
const stripP = (html: string) =>
  html.replace(/^<p>/, "").replace(/<\/p>$/, "");

const HeroSection = () => {
  const c = useSiteContent<HeroContent>("hero", fallback);

  // Normalise title_lines: support old {text,type} objects and new HTML strings
  const titleLines: string[] = (c.title_lines || []).map((line: any) => {
    if (typeof line === "string") return line;
    // Legacy TitleLine object
    return line.type === "accent"
      ? `<p><span style="color: hsl(var(--hero-title-accent))">${line.text}</span></p>`
      : `<p>${line.text}</p>`;
  });

  // Fallback for very old flat fields
  if (titleLines.length === 0 && (c.title_line1 || c.title_accent || c.title_line2)) {
    if (c.title_line1) titleLines.push(`<p>${c.title_line1}</p>`);
    if (c.title_accent) titleLines.push(`<p><span style="color: hsl(var(--hero-title-accent))">${c.title_accent}</span></p>`);
    if (c.title_line2) titleLines.push(`<p>${c.title_line2}</p>`);
  }

  const hasBg = c.bg_type && c.bg_type !== "none" && c.bg_url;

  return (
    <section
      className="scope-hero relative pt-32 pb-20 md:py-32 md:pt-40 text-center overflow-hidden"
      style={{ backgroundColor: "hsl(var(--hero-bg))" }}>
      {/* Background media */}
      {hasBg && c.bg_type === "image" && (
        <div className="absolute inset-0 z-0">
          <img src={c.bg_url} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}
      {hasBg && c.bg_type === "video" && (
        <div className="absolute inset-0 z-0">
          <video
            src={c.bg_url}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}

      <div className="relative z-10 max-w-[800px] mx-auto px-6">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="font-body text-[11px] tracking-[0.2em] uppercase mb-6"
          style={{ color: "hsl(var(--hero-label))" }}>
          {c.label}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease }}
          className="font-display text-3xl md:text-5xl lg:text-[3.5rem] font-black leading-[1.05] mb-0"
          style={{ color: "hsl(var(--hero-title))" }}>
          {titleLines.map((line, i) => (
            <span key={i}>
              {i > 0 && <br />}
              <span dangerouslySetInnerHTML={{ __html: stripP(line) }} />{" "}
            </span>
          ))}
        </motion.h1>

        {c.subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease }}
            className="text-lg md:text-xl leading-tight mt-0"
            style={{
              fontFamily: "'Architects Daughter', cursive",
              color: "hsl(var(--hero-body))",
            }}>
            {c.subtitle}
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease }}
          className="font-body-heading text-lg max-w-[620px] mx-auto leading-relaxed mt-6"
          style={{ color: "hsl(var(--hero-body))" }}
          dangerouslySetInnerHTML={{ __html: c.body }}
        />
      </div>
    </section>
  );
};

export default HeroSection;
