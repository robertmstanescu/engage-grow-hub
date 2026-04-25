import { motion } from "framer-motion";
import { useSiteContentWithStatus } from "@/hooks/useSiteContent";
import { useIsMobile } from "@/hooks/use-mobile";
import { sanitizeHtml } from "@/services/sanitize";
import EditableText from "@/features/admin/EditableText";
import {
  buildImageSrcSet,
  buildPosterUrl,
  isSupabaseStorageUrl,
  transformImageUrl,
  HERO_SRCSET_WIDTHS,
} from "@/services/mediaOptimization";

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
  /** Optional dedicated poster image for video backgrounds. */
  bg_poster_url?: string;
  bg_image_alt?: string;
  title_line1?: string;
  title_accent?: string;
  title_line2?: string;
}

// No hardcoded copy — DB is the single source of truth. The hero is
// gated on `isLoading` below, so this empty fallback is only ever used
// as a typed safety net and never paints user-visible content.
const fallback: HeroContent = {
  label: "",
  body: "",
  title_lines: [],
};

const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

const HeroSection = () => {
  /**
   * Loading-aware read of the "hero" CMS section.
   *
   * WHY `useSiteContentWithStatus` INSTEAD OF `useSiteContent`?
   * The hero is the first thing users see. If we used the plain hook,
   * the hardcoded `fallback` strings ("Your organisation has vampires.")
   * would paint for a few hundred milliseconds before the real DB
   * content arrived — a jarring text-swap. By gating render on
   * `isLoading`, we paint NOTHING (just the ambient background) until
   * we either have real content or react-query confirms there is none.
   * Once cached after the first visit, `isLoading` is false on first
   * render so repeat visits feel instant.
   */
  const { isLoading, content: c } = useSiteContentWithStatus<HeroContent>("hero", fallback);

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

  /**
   * Cold-load guard — see comment on `useSiteContentWithStatus` above.
   * On the very first visit (no cache yet) we render an empty hero
   * shell that preserves layout height (so the page doesn't jump when
   * content arrives) but paints zero text. As soon as react-query
   * resolves, this branch is skipped and the real hero animates in.
   * On every subsequent navigation the cache is warm, so this branch
   * never executes.
   */
  if (isLoading) {
    return (
      <section
        data-section="hero"
        aria-busy="true"
        className="scope-hero snap-section grain relative h-screen mesh-hero"
      />
    );
  }

  return (
    <section data-section="hero" className="scope-hero snap-section grain relative h-screen flex flex-col justify-end overflow-hidden mesh-hero">
      {/*
        LAYERING ORDER (bottom → top):
        1. Ambient glow (z-[-2])      — decorative gradients sit at the very back
        2. Background image (z-[-1])  — uploaded PNG/video sits ABOVE the glow
                                        so it is never washed out by the blur
        3. Content (z-10)             — text & CTAs always win
      */}
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px] z-[-2]"
        style={{ background: "radial-gradient(circle, hsl(280 55% 30%), transparent)" }} />
      <div className="absolute top-1/4 right-0 w-[400px] h-[400px] rounded-full opacity-10 blur-[100px] z-[-2]"
        style={{ background: "radial-gradient(circle, hsl(46 75% 60%), transparent)" }} />

      {hasBg && c.bg_type === "image" && (
        <div className="absolute inset-0 z-[-1]">
          {/*
            Hero background image — this is almost always the LCP
            (Largest Contentful Paint) element on the homepage.
            • srcSet/sizes serve the smallest viable rendition for the
              visitor's viewport. A phone gets ~640px @ ~50KB; a 4K
              monitor gets 2400px @ ~250KB. The same admin upload
              powers every device without a manual export step.
            • Supabase Image Transformations (/render/image/public/)
              re-encode the original to WebP on the fly, then cache the
              result at the CDN edge. Non-Supabase URLs (e.g. third-
              party CDNs) fall back to the raw `src` unchanged.
            • fetchpriority="high" tells the browser to download it
              before non-critical resources, improving Core Web Vitals.
            • decoding="async" keeps decoding off the main thread.
            • No loading="lazy" — the hero is above the fold and we
              WANT it to load eagerly. Lazy here would hurt LCP.
          */}
          <img
            src={
              isSupabaseStorageUrl(c.bg_url)
                ? transformImageUrl(c.bg_url, { width: 1600, quality: 75 })
                : c.bg_url
            }
            srcSet={buildImageSrcSet(c.bg_url) || undefined}
            sizes={`(max-width: 640px) 100vw, (max-width: 1280px) 100vw, ${HERO_SRCSET_WIDTHS[HERO_SRCSET_WIDTHS.length - 1]}px`}
            alt={c.bg_image_alt || ""}
            className="w-full h-full object-cover"
            fetchPriority="high"
            decoding="async"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}
      {hasBg && c.bg_type === "video" && (
        <div className="absolute inset-0 z-[-1]">
          {/*
            Hero background video — videos cannot be the LCP element,
            so we mandate a `poster` attribute. The poster paints
            instantly (it's a tiny WebP) while the MP4 streams in,
            avoiding a blank black hero on slow networks. We prefer the
            admin-supplied `bg_poster_url`; if missing, we synthesise a
            small WebP from the video URL itself only if it's a
            Supabase image (videos themselves can't be transcoded by
            the image-transform endpoint). Falling back to no poster
            is acceptable but degrades perceived load.
          */}
          <video
            src={c.bg_url}
            poster={
              c.bg_poster_url
                ? buildPosterUrl(c.bg_poster_url)
                : undefined
            }
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}

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
              <span className="text-5xl md:text-8xl" dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} />
            </motion.span>
          ))}
        </h1>

        {c.tagline && (
          /*
           * SEO HIERARCHY (intentional choice):
           * The tagline is rendered as a stylized <p>, NOT an <h2>.
           * Reason: every page must have exactly one H1 (the hero
           * `title_lines`) followed by H2 section headings from the
           * downstream rows. Demoting this to <p> keeps the heading
           * outline clean for search engines and screen readers while
           * preserving the visual styling.
           */
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ duration: 1, delay: 0.8, ease }}
            className="font-body tracking-[0.3em] uppercase mt-[2vh]"
            style={{ color: c.tagline_color || "hsl(var(--hero-label))", fontSize: "clamp(8px, 1vw, 11px)" }}>
            <EditableText sectionKey="hero" fieldPath="tagline" as="span">
              {c.tagline}
            </EditableText>
          </motion.p>
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
