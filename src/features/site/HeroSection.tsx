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

/**
 * HeroView — PURE, presentational hero.
 *
 * WHY this split (US 15.1):
 * The admin canvas needs to render the live hero against the in-memory
 * DRAFT content (not the database-published content). By extracting a
 * pure component that accepts `content` as a prop, the admin can render
 * `<HeroView content={draftHero} />` for true WYSIWYG, while the public
 * site continues to use the data-fetching wrapper below — unchanged DOM,
 * unchanged styling, unchanged animations.
 *
 * RULE (per US 15.1 Dev Notes): this component must be COMPLETELY
 * IGNORANT of the admin panel. It only takes `content` and renders HTML.
 */
export const HeroView = ({ content: c, isLoading = false }: { content: HeroContent; isLoading?: boolean }) => {
  const isMobile = useIsMobile();

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
        className="scope-hero snap-section grain relative mesh-hero"
        style={{ height: "calc(100vh - var(--nav-top-offset, 0px))" }}
      />
    );
  }

  return (
    <section
      data-section="hero"
      className="scope-hero snap-section grain relative flex flex-col justify-end mesh-hero overflow-hidden"
      style={{ minHeight: "calc(100dvh - var(--nav-top-offset, 0px))" }}
    >
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
            MOBILE GUARD — On phones/tablets we never download the MP4.
            Cellular networks + battery + small screens make autoplaying
            video a conversion-killer (and a data-plan tax). Instead we
            render the admin-supplied poster (or a synthesised one from
            the video URL if it lives on Supabase storage) as a static
            optimized image. Desktop visitors still get the full motion
            experience. The breakpoint comes from `useIsMobile` (1024px)
            so it lines up with the rest of the responsive system.
          */}
          {isMobile ? (
            (() => {
              const fallbackImg = c.bg_poster_url || (isSupabaseStorageUrl(c.bg_url) ? c.bg_url : undefined);
              if (!fallbackImg) {
                return <div className="absolute inset-0 bg-black" />;
              }
              return (
                <img
                  src={
                    isSupabaseStorageUrl(fallbackImg)
                      ? transformImageUrl(fallbackImg, { width: 1024, quality: 70 })
                      : fallbackImg
                  }
                  srcSet={buildImageSrcSet(fallbackImg) || undefined}
                  sizes="100vw"
                  alt={c.bg_image_alt || ""}
                  className="w-full h-full object-cover"
                  fetchPriority="high"
                  decoding="async"
                />
              );
            })()
          ) : (
            /*
              Hero background video (desktop only) — videos cannot be the
              LCP element, so we mandate a `poster` attribute. The poster
              paints instantly (a tiny WebP) while the MP4 streams in,
              avoiding a blank black hero on slow networks. We prefer the
              admin-supplied `bg_poster_url`; otherwise we synthesise a
              small WebP from the video URL itself only if it's a
              Supabase image (videos themselves can't be transcoded by
              the image-transform endpoint).
            */
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
          )}
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}

      <div className="relative z-10 w-full max-w-[1100px] px-3 pb-[3vh] pt-[4vh] flex min-h-0 flex-1 flex-col justify-end overflow-y-auto">
        {/*
          Must-fit cluster (eyebrow + title + tagline): the title font
          size is bounded by BOTH vw and vh so it shrinks on short
          viewports. The whole content area scrolls if the body still
          overflows after sizing — this guarantees the user can always
          reach the eyebrow/title at the top by scrolling up.
        */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2, ease }}
          className="font-body tracking-[0.28em] uppercase mb-[1.2vh] flex-shrink-0"
          style={{ color: "hsl(var(--hero-label))", fontSize: "clamp(0.42rem, min(0.85vw, 1.05vh), 0.68rem)" }}>
          <EditableText sectionKey="hero" fieldPath="label" as="span">
            {c.label}
          </EditableText>
        </motion.p>

        <h1
          className="font-display font-black leading-[0.9] tracking-tight mb-0 max-w-[95%] flex-shrink-0"
          style={{ color: "hsl(var(--hero-title))", fontSize: "clamp(1.1rem, min(5vw, 6.4vh), 5.5rem)" }}>
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
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ duration: 1, delay: 0.8, ease }}
            className="font-body tracking-[0.25em] uppercase mt-[1.2vh] flex-shrink-0"
            style={{ color: c.tagline_color || "hsl(var(--hero-label))", fontSize: "clamp(0.42rem, min(0.85vw, 1.05vh), 0.68rem)" }}>
            <EditableText sectionKey="hero" fieldPath="tagline" as="span">
              {c.tagline}
            </EditableText>
          </motion.p>
        )}

        {c.subtitle && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1, ease }}
            className="flex-shrink-0 mt-[1.2vh]">
            <EditableText
              sectionKey="hero"
              fieldPath="subtitle"
              as="p"
              className="leading-tight max-w-[550px]"
              style={{
                fontFamily: "'Architects Daughter', cursive",
                color: c.subtitle_color || "hsl(var(--hero-body))",
                fontSize: "clamp(0.72rem, min(1.7vw, 2.2vh), 1.15rem)",
              }}>
              {c.subtitle}
            </EditableText>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1, ease }}
          className="flex-shrink-0">
          <EditableText
            sectionKey="hero"
            fieldPath="body"
            html
            as="div"
            className="font-body-heading max-w-[480px] leading-relaxed mt-[1.2vh]"
            style={{ color: "hsl(var(--hero-body))", opacity: 0.75, fontSize: "clamp(0.68rem, min(1.25vw, 1.6vh), 1rem)" }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.body) }}
          />
        </motion.div>
      </div>
    </section>
  );
};

/**
 * HeroSection — public-site data wrapper.
 *
 * Reads the published "hero" CMS section and forwards it to <HeroView>.
 * The split exists so that the admin's three-pane builder can render
 * <HeroView content={draftHero} /> against unsaved draft state without
 * duplicating any markup or styling (US 15.1).
 */
const HeroSection = () => {
  const { isLoading, content } = useSiteContentWithStatus<HeroContent>("hero", fallback);
  return <HeroView content={content} isLoading={isLoading} />;
};

export default HeroSection;

