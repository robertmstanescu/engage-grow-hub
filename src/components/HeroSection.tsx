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
    <section
      className="scope-hero grain-overlay relative min-h-screen flex flex-col justify-end overflow-hidden"
      style={{ backgroundColor: "hsl(var(--hero-bg))" }}>
      {/* Background media */}
      {hasBg && c.bg_type === "image" && (
        <div className="absolute inset-0 z-0">
          <img src={c.bg_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}
      {hasBg && c.bg_type === "video" && (
        <div className="absolute inset-0 z-0">
          <video src={c.bg_url} autoPlay muted loop playsInline className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}

      {/* Content — left-aligned, editorial layout */}
      <div className="relative z-10 w-full max-w-[1100px] mx-auto px-8 md:px-12 pb-20 md:pb-28 pt-40">
        {/* Label */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease }}
          className="font-body text-[10px] tracking-[0.3em] uppercase mb-8"
          style={{ color: "hsl(var(--hero-label))" }}>
          <EditableText sectionKey="hero" fieldPath="label" as="span">
            {c.label}
          </EditableText>
        </motion.p>

        {/* Title — oversized, left-aligned */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease }}
          className="font-display text-4xl md:text-6xl lg:text-[4.5rem] xl:text-[5.5rem] font-black leading-[0.95] tracking-tight mb-0 max-w-[900px]"
          style={{ color: "hsl(var(--hero-title))" }}>
          {titleLines.map((line, i) => (
            <span key={i}>
              {i > 0 && <br />}
              <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} />{" "}
            </span>
          ))}
        </motion.h1>

        {/* Tagline */}
        {c.tagline && (
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease }}
            className="font-body text-[10px] tracking-[0.25em] uppercase mt-6 mb-0"
            style={{ color: c.tagline_color || "hsl(var(--hero-label))", opacity: 0.6 }}>
            <EditableText sectionKey="hero" fieldPath="tagline" as="span">
              {c.tagline}
            </EditableText>
          </motion.h2>
        )}

        {/* Subtitle (Architects Daughter) */}
        {c.subtitle && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease }}>
            <EditableText
              sectionKey="hero"
              fieldPath="subtitle"
              as="p"
              className="text-lg md:text-xl leading-tight mt-5 max-w-[600px]"
              style={{
                fontFamily: "'Architects Daughter', cursive",
                color: c.subtitle_color || "hsl(var(--hero-body))",
              }}>
              {c.subtitle}
            </EditableText>
          </motion.div>
        )}

        {/* Body */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease }}>
          <EditableText
            sectionKey="hero"
            fieldPath="body"
            html
            as="div"
            className="font-body-heading text-base md:text-lg max-w-[520px] leading-relaxed mt-8"
            style={{ color: "hsl(var(--hero-body))", opacity: 0.85 }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.body) }}
          />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
