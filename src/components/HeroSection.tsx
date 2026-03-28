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
    <section className="scope-hero snap-section grain relative h-screen flex flex-col justify-end overflow-hidden mesh-hero">
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

      <div className="relative z-10 w-full max-w-[1100px] px-3 pb-[4vh] pt-[15vh] flex flex-col justify-end">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2, ease }}
          className="font-body tracking-[0.35em] uppercase mb-[2vh]"
          style={{ color: "hsl(var(--hero-label))", fontSize: "clamp(8px, 1vw, 11px)" }}>
          <EditableText sectionKey="hero" fieldPath="label" as="span">
            {c.label}
          </EditableText>
        </motion.p>

        <h1
          className="font-display font-black leading-[0.92] tracking-tight mb-0 max-w-[95%]"
          style={{ color: "hsl(var(--hero-title))", fontSize: "clamp(2rem, 6.5vw, 6rem)" }}>
          {titleLines.map((line, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 + i * 0.12, ease }}
              className="block">
              <span className="text-6xl" dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} />
            </motion.span>
          ))}
        </h1>

        {c.tagline && (
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ duration: 1, delay: 0.8, ease }}
            className="font-body tracking-[0.3em] uppercase mt-[2vh]"
            style={{ color: c.tagline_color || "hsl(var(--hero-label))", fontSize: "clamp(8px, 1vw, 11px)" }}>
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
              className="leading-tight mt-[1.5vh] max-w-[550px]"
              style={{
                fontFamily: "'Architects Daughter', cursive",
                color: c.subtitle_color || "hsl(var(--hero-body))",
                fontSize: "clamp(0.9rem, 2vw, 1.25rem)",
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
            className="font-body-heading max-w-[480px] leading-relaxed mt-[2vh]"
            style={{ color: "hsl(var(--hero-body))", opacity: 0.75, fontSize: "clamp(0.8rem, 1.5vw, 1.1rem)" }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.body) }}
          />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
