import { sanitizeHtml } from "@/services/sanitize";
import type { PageRow } from "@/types/rows";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import RowBackground from "./RowBackground";
import { resolveImageAlt } from "@/services/imageAlt";

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

  const { ref, isVisible } = useScrollReveal({ threshold: 0.15 });

  return (
    <section
      className="snap-section grain relative h-[100dvh] flex flex-col justify-end overflow-visible"
      style={{ isolation: "isolate", backgroundColor: "hsl(260 20% 4%)" }}
    >
      <RowBackground row={row} />

      {hasBg && bgType === "image" && (
        <div className="absolute inset-0 z-0">
          {/*
            HeroRow background — same LCP-critical pattern as the main
            <HeroSection/>. Eagerly fetched with high priority so users
            see it on first paint.
          */}
          <img
            src={bgUrl}
            alt={resolveImageAlt(c.bg_image_alt, row.strip_title, "hero background")}
            className="w-full h-full object-cover"
            fetchPriority="high"
            decoding="async"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          {/*
            Ticket 1.3 — Dynamic gradient overlay (replaces the old flat
            `bg-black/60` wash). Dark at the bottom so the headline stays
            readable on white-text layouts, fading to transparent at the
            top so the image's true colors come through and the section
            still feels like premium photography.
            Uses --background tokens so the gradient adapts cleanly to
            both light and dark themes.
          */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent" />
        </div>
      )}
      {hasBg && bgType === "video" && (
        <div className="absolute inset-0 z-0">
          <video src={bgUrl} autoPlay muted loop playsInline className="w-full h-full object-cover" />
          {/* Ticket 1.3 — see image branch above for the rationale. */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent" />
        </div>
      )}

      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px] pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(280 55% 30%), transparent)" }} />

      <div ref={ref} className="relative z-10 w-full max-w-[1100px] px-4 sm:px-6 pb-[4vh] pt-[15vh] flex flex-col justify-end overflow-visible">
        {c.label && (
          <p className="font-body tracking-[0.35em] uppercase mb-[2vh]"
            style={{ ...revealStyle(isVisible, 0), color: c.color_label || c.label_color || "hsl(var(--hero-label))", fontSize: "clamp(8px, 1vw, 11px)" }}>
            {c.label}
          </p>
        )}

        {titleLines.length > 0 && (
          <h1 className="font-display font-black leading-[0.92] tracking-tight mb-0 w-full overflow-visible"
            style={{ color: c.title_color || "hsl(var(--hero-title))", fontSize: "clamp(1.6rem, 5vw, 5.5rem)" }}>
            {titleLines.map((line, i) => (
              <span key={i} className="block overflow-visible" style={revealStyle(isVisible, i + 1, 0.1)}>
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
            style={{ ...revealStyle(isVisible, titleLines.length + 2, 0.1), fontFamily: "'Architects Daughter', cursive", color: c.subtitle_color || "hsl(var(--hero-body))", fontSize: "clamp(0.85rem, 1.8vw, 1.15rem)" }}>
            {c.subtitle}
          </p>
        )}

        {c.body && (
          <div className="font-body-heading max-w-[480px] leading-relaxed mt-[2vh] [&_p]:mb-[5px] [&_p]:mt-[5px]"
            style={{ ...revealStyle(isVisible, titleLines.length + 3, 0.1), color: c.body_color || "hsl(var(--hero-body))", fontSize: "clamp(0.75rem, 1.3vw, 1rem)" }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.body) }}
          />
        )}

        {c.cta_url && c.cta_label && (
          <div className="mt-[2vh]" style={revealStyle(isVisible, titleLines.length + 4, 0.1)}>
            <a href={c.cta_url} target={c.cta_url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
              className="btn-glass interactive font-display text-[10px] uppercase tracking-[0.1em] font-bold px-6 py-3 rounded-full inline-block"
              style={{ backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--primary-foreground))" }}>
              {c.cta_label}
            </a>
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroRow;
