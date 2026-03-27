import { motion } from "framer-motion";
import { useSiteContent } from "@/hooks/useSiteContent";
import { sanitizeHtml } from "@/lib/sanitize";
import EditableText from "@/components/admin/EditableText";

const ease = [0.16, 1, 0.3, 1] as const;

interface HeroContent {
  label: string;
  tagline?: string;
  tagline_color?: string;
  title_lines?: any[];
  subtitle?: string;
  subtitle_color?: string;
  body: string;
  bg_type?: "none" | "image" | "video";
  bg_url?: string;
  title_line1?: string;
  title_accent?: string;
  title_line2?: string;
}

const fallback: HeroContent = {
  label: "What we do",
  tagline: "HR & Internal Comms Consulting",
  title_lines: [
    "<p>Your organisation has</p>",
    '<p><span style="color: #E5C54F">vampires.</span></p>',
    "<p>We bring the coffin.</p>",
  ],
  body: "Dead meetings. Blood-sucking cultures. Communications that say everything while meaning nothing. We bury all of it — and build something with an actual pulse in its place.",
};

const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

// Word-by-word reveal for plain text
const WordReveal = ({ text, delay = 0 }: { text: string; delay?: number }) => {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: delay + i * 0.06, ease }}
          className="inline-block mr-[0.3em]">
          {word}
        </motion.span>
      ))}
    </>
  );
};

const HeroSection = () => {
  const c = useSiteContent<HeroContent>("hero", fallback);

  const titleLines: string[] = (c.title_lines || []).map((line: any) => {
    if (typeof line === "string") return line;
    return line.type === "accent"
      ? `<p><span style="color: hsl(var(--hero-title-accent))">${line.text}</span></p>`
      : `<p>${line.text}</p>`;
  });

  if (titleLines.length === 0 && (c.title_line1 || c.title_accent || c.title_line2)) {
    if (c.title_line1) titleLines.push(`<p>${c.title_line1}</p>`);
    if (c.title_accent) titleLines.push(`<p><span style="color: hsl(var(--hero-title-accent))">${c.title_accent}</span></p>`);
    if (c.title_line2) titleLines.push(`<p>${c.title_line2}</p>`);
  }

  const hasBg = c.bg_type && c.bg_type !== "none" && c.bg_url;

  return (
    <section className="scope-hero snap-section grain relative min-h-screen flex flex-col justify-end overflow-hidden mesh-hero">
      {hasBg && c.bg_type === "image" && (
        <div className="absolute inset-0 z-0">
          <img src={c.bg_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}
      {hasBg && c.bg_type === "video" && (
        <div className="absolute inset-0 z-0">
          <video src={c.bg_url} autoPlay muted loop playsInline className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}

      {/* Ambient glow */}
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
        style={{ background: "radial-gradient(circle, hsl(280 55% 30%), transparent)" }} />
      <div className="absolute top-1/4 right-0 w-[400px] h-[400px] rounded-full opacity-10 blur-[100px]"
        style={{ background: "radial-gradient(circle, hsl(46 75% 60%), transparent)" }} />

      <div className="relative z-10 w-full max-w-[1100px] mx-auto pl-8 lg:pl-24 pr-8 pb-24 md:pb-32 pt-44">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2, ease }}
          className="font-body text-[10px] tracking-[0.35em] uppercase mb-10"
          style={{ color: "hsl(var(--hero-label))" }}>
          <EditableText sectionKey="hero" fieldPath="label" as="span">
            {c.label}
          </EditableText>
        </motion.p>

        <h1
          className="font-display text-4xl md:text-6xl lg:text-[5rem] xl:text-[6rem] font-black leading-[0.92] tracking-tight mb-0 max-w-[950px]"
          style={{ color: "hsl(var(--hero-title))" }}>
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

        {c.tagline && (
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ duration: 1, delay: 0.8, ease }}
            className="font-body text-[10px] tracking-[0.3em] uppercase mt-8"
            style={{ color: c.tagline_color || "hsl(var(--hero-label))" }}>
            <EditableText sectionKey="hero" fieldPath="tagline" as="span">
              {c.tagline}
            </EditableText>
          </motion.h2>
        )}

        {c.subtitle && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1, ease }}>
            <EditableText
              sectionKey="hero"
              fieldPath="subtitle"
              as="p"
              className="text-lg md:text-xl leading-tight mt-6 max-w-[550px]"
              style={{
                fontFamily: "'Architects Daughter', cursive",
                color: c.subtitle_color || "hsl(var(--hero-body))",
              }}>
              {c.subtitle}
            </EditableText>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1, ease }}>
          <EditableText
            sectionKey="hero"
            fieldPath="body"
            html
            as="div"
            className="font-body-heading text-base md:text-lg max-w-[480px] leading-relaxed mt-8"
            style={{ color: "hsl(var(--hero-body))", opacity: 0.75 }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.body) }}
          />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
