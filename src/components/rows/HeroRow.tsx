import { sanitizeHtml } from "@/lib/sanitize";
import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/types/rows";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";

const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

interface Props {
  row: PageRow;
}

const HeroRow = ({ row }: Props) => {
  const c = row.content;
  const l = { ...DEFAULT_ROW_LAYOUT, ...row.layout };
  const titleLines: string[] = (c.title_lines || []).map((line: any) =>
    typeof line === "string" ? (line.startsWith("<") ? line : `<p>${line}</p>`) : `<p>${line}</p>`
  );

  const bgType = c.bg_type || "none";
  const bgUrl = c.bg_url || "";
  const hasBg = bgType !== "none" && bgUrl;

  const gradStart = l.gradientStart || "hsl(280 55% 20% / 0.8)";
  const gradEnd = l.gradientEnd || "hsl(286 42% 25% / 0.5)";

  const { ref, isVisible } = useScrollReveal({ threshold: 0.15 });

  return (
    <section className="snap-section grain relative h-screen flex flex-col justify-end overflow-hidden" style={{
      isolation: "isolate",
      background: `radial-gradient(ellipse 100% 80% at 20% 100%, ${gradStart}, transparent), radial-gradient(ellipse 80% 60% at 90% 10%, ${gradEnd}, transparent), radial-gradient(ellipse 40% 30% at 60% 70%, hsl(46 75% 60% / 0.06), transparent), hsl(260 20% 4%)`,
    }}>
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

      <div ref={ref} className="relative z-10 w-full max-w-[1100px] px-6 pb-[4vh] pt-[15vh] flex flex-col justify-end">
        {c.label && (
          <p className="font-body tracking-[0.35em] uppercase mb-[2vh]"
            style={{ ...revealStyle(isVisible, 0), color: c.color_label || c.label_color || "hsl(var(--hero-label))", fontSize: "clamp(8px, 1vw, 11px)" }}>
            {c.label}
          </p>
        )}

        {titleLines.length > 0 && (
          <h1 className="font-display font-black leading-[0.92] tracking-tight mb-0 max-w-[95%]"
            style={{ color: c.title_color || "hsl(var(--hero-title))", fontSize: "clamp(1.8rem, 5.5vw, 6rem)" }}>
            {titleLines.map((line, i) => (
              <span key={i} className="block" style={revealStyle(isVisible, i + 1, 0.1)}>
                <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} />
              </span>
            ))}
          </h1>
        )}

        {c.tagline && (
          <p className="font-body tracking-[0.3em] uppercase mt-[2vh]"
            style={{ ...revealStyle(isVisible, titleLines.length + 1, 0.1), color: c.color_tagline || c.tagline_color || "hsl(var(--hero-label))", fontSize: "clamp(8px, 1vw, 11px)", opacity: isVisible ? 0.4 : 0 }}>
            {c.tagline}
          </p>
        )}

        {c.subtitle && (
          <p className="leading-tight mt-[1.5vh] max-w-[550px]"
            style={{ ...revealStyle(isVisible, titleLines.length + 2, 0.1), fontFamily: "'Architects Daughter', cursive", color: c.subtitle_color || "hsl(var(--hero-body))", fontSize: "clamp(0.9rem, 2vw, 1.25rem)" }}>
            {c.subtitle}
          </p>
        )}

        {c.body && (
          <div className="font-body-heading max-w-[480px] leading-relaxed mt-[2vh]"
            style={{ ...revealStyle(isVisible, titleLines.length + 3, 0.1), color: c.body_color || "hsl(var(--hero-body))", fontSize: "clamp(0.8rem, 1.5vw, 1.1rem)" }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.body) }}
          />
        )}
      </div>
    </section>
  );
};

export default HeroRow;
