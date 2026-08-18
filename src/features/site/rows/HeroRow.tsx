import { sanitizeHtml } from "@/services/sanitize";

import type { PageRow } from "@/types/rows";
import RowBackground from "./RowBackground";
import { resolveImageAlt } from "@/services/imageAlt";
import Icon from "@/features/icons/Icon";
import { hasText } from "./PrimaryHeadingContext";

const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

interface Props {
  row: PageRow;
}

const HeroRow = ({ row }: Props) => {
  const c = row.content;
  /* Drop blank / markup-only lines so an empty Hero never emits an
     empty <h1> (an empty heading is worse for SEO than none). */
  const titleLines: string[] = (c.title_lines || []).filter((line: any) => hasText(String(line ?? ""))).map((line: any) =>
    typeof line === "string"
      ? (line.startsWith("<") ? line : `<span class="block">${line}</span>`)
      : `<span class="block">${line}</span>`
  );

  const bgType = c.bg_type || "none";
  const bgUrl = c.bg_url || "";
  const hasBg = bgType !== "none" && bgUrl;

  // Motion is deliberately minimal: one soft fade-and-rise on the whole
  // hero block (see `.hero-enter` in index.css). No per-item stagger.


  return (
    <section
      className="snap-section grain relative flex flex-col justify-center overflow-hidden"
      data-snap-enabled="true"
      style={{ isolation: "isolate", backgroundColor: "hsl(var(--background))", minHeight: "calc(100dvh - var(--nav-top-offset, 0px))" }}
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
        style={{ background: "radial-gradient(circle, hsl(285 45% 88%), transparent)" }} />

      <div className="hero-enter relative z-10 flex min-h-0 flex-1 w-full max-w-[1400px] flex-col justify-center overflow-y-auto row-container py-[clamp(48px,7vh,96px)]">
        {c.icon && (
          <div className="mb-[clamp(12px,1.5vh,24px)]" style={{ color: c.title_color || "hsl(var(--hero-title))" }}>
            <Icon value={c.icon} size={48} />
          </div>
        )}

        {c.label && (
          <p className="font-body tracking-[0.32em] uppercase mb-[clamp(12px,1.5vh,24px)]"
            style={{ color: c.color_label || c.label_color || "hsl(var(--hero-label))", fontSize: "var(--fs-hero-label)" }}>
            {c.label}
          </p>
        )}

        {titleLines.length > 0 && (
          <h1 className="font-display font-black leading-[0.98] tracking-tight mb-0 w-full overflow-visible"
            style={{ color: c.title_color || "hsl(var(--hero-title))", fontSize: "var(--fs-hero-title)" }}>
            {titleLines.map((line, i) => (
              <span key={i} className="block overflow-visible">
                <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} />
              </span>
            ))}
          </h1>
        )}

        {c.tagline && (
          <p className="font-body tracking-[0.28em] uppercase mt-[clamp(14px,1.8vh,28px)]"
            style={{ color: c.color_tagline || c.tagline_color || "hsl(var(--hero-label))", fontSize: "var(--fs-hero-label)", opacity: 0.75 }}>
            {c.tagline}
          </p>
        )}

        {c.subtitle && (
          <p className="leading-tight mt-[clamp(12px,1.5vh,24px)] max-w-[640px]"
            style={{ fontFamily: "'Architects Daughter', cursive", color: c.subtitle_color || "hsl(var(--hero-body))", fontSize: "var(--fs-hero-subtitle)" }}>
            {c.subtitle}
          </p>
        )}

        {c.body && (
          <div className="font-body-heading max-w-[620px] leading-relaxed mt-[clamp(12px,1.5vh,24px)] [&_p]:mb-[4px] [&_p]:mt-[4px]"
            style={{ color: c.body_color || "hsl(var(--hero-body))", fontSize: "var(--fs-hero-body)" }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.body) }}
          />
        )}

        {c.cta_url && c.cta_label && (
          <div className="mt-[clamp(20px,2.4vh,36px)]">
            <a href={c.cta_url} target={c.cta_url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
              className="btn-ink"
>
              {c.cta_label}
            </a>
          </div>
        )}
      </div>

    </section>
  );
};

export default HeroRow;
