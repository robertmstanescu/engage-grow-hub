import { motion } from "framer-motion";
import { useSiteContent } from "@/hooks/useSiteContent";
import { sanitizeHtml } from "@/lib/sanitize";
import EditableText from "@/components/admin/EditableText";

const ease = [0.16, 1, 0.3, 1] as const;

interface HeroContent {
  label: string;
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
      className="scope-hero relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden"
      style={{ backgroundColor: "hsl(var(--hero-bg))" }}>
      {hasBg && c.bg_type === "image" && (
        <div className="absolute inset-0 z-0">
          <img src={c.bg_url} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}
      {hasBg && c.bg_type === "video" && (
        <div className="absolute inset-0 z-0">
          <video src={c.bg_url} autoPlay muted loop playsInline className="w-full h-full object-cover" />
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
          <EditableText sectionKey="hero" fieldPath="label" as="span">
            {c.label}
          </EditableText>
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
              <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} />{" "}
            </span>
          ))}
        </motion.h1>

        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12, ease }}
          className="font-body text-[11px] tracking-[0.18em] uppercase mt-3 mb-4"
          style={{ color: "hsl(var(--hero-label))", opacity: 0.75 }}>
          HR &amp; Internal Comms Consulting
        </motion.h2>

        {c.subtitle && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease }}>
            <EditableText
              sectionKey="hero"
              fieldPath="subtitle"
              as="p"
              className="text-lg md:text-xl leading-tight"
              style={{
                fontFamily: "'Architects Daughter', cursive",
                color: c.subtitle_color || "hsl(var(--hero-body))",
                paddingTop: "10px",
              }}>
              {c.subtitle}
            </EditableText>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease }}>
          <EditableText
            sectionKey="hero"
            fieldPath="body"
            html
            as="div"
            className="font-body-heading text-lg max-w-[620px] mx-auto leading-relaxed mt-6"
            style={{ color: "hsl(var(--hero-body))" }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.body) }}
          />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
