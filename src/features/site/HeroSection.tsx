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
export const HeroView = ({
  content: c,
  isLoading = false,
  /* CMS hero ROWS reuse this exact view, but they are not the
     site_content "hero" section, so inline editing must be off there
     (otherwise a blur would write into the homepage hero). */
  editable = true,
  /** Extra style merged onto the <section> (e.g. a row's own colour). */
  sectionStyle,
  /** Optional node rendered above the eyebrow (CMS hero rows use an icon). */
  leading,
  /** Optional node rendered under the body (CMS hero rows use a CTA). */
  trailing,
}: {
  content: HeroContent;
  isLoading?: boolean;
  editable?: boolean;
  sectionStyle?: React.CSSProperties;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}) => {
  const isMobile = useIsMobile();

  /* Inline-edit wrapper. On CMS hero rows we render the plain element so
     the markup, spacing and type scale stay byte-identical. */
  const Field = ({ fieldPath, as = "span", html, children, ...rest }: any) => {
    if (editable) {
      return (
        <EditableText sectionKey="hero" fieldPath={fieldPath} as={as} html={html} {...rest}>
          {children}
        </EditableText>
      );
    }
    const El = as as any;
    return <El {...rest}>{children}</El>;
  };

  const titleLines: string[] = (c.title_lines || [])
    .map((line: any) => {
      if (typeof line === "string") return line;
      return line.type === "accent"
        ? `<p><span style="color: hsl(var(--hero-title-accent))">${line.text}</span></p>`
        : `<p>${line.text}</p>`;
    })
    /* Drop blank / markup-only lines so an empty hero never emits an
       empty <h1> (worse for SEO than no heading at all). */
    .filter((line: string) => line.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length > 0);

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
        data-snap-enabled="true"
        aria-busy="true"
        className="scope-hero snap-section grain relative"
        style={{ height: "calc(100vh - var(--nav-top-offset, 0px))" }}
      />
    );
  }

  return (
    <section
      data-section="hero"
      data-snap-enabled="true"
      className="scope-hero snap-section grain relative flex flex-col justify-center overflow-hidden"
      style={{ minHeight: "calc(100dvh - var(--nav-top-offset, 0px))", ...sectionStyle }}
    >
      {/*
        LAYERING ORDER (bottom → top):
        1. Background image / video (z-[-1])
        2. Content (z-10) — text & CTAs always win
        Ambient blurred gradient blobs were removed for a crisp,
        structured layout (Lativ-style).
      */}


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
          <div className="absolute inset-0" style={{ backgroundColor: "hsl(var(--background) / 0.72)" }} />
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
                return <div className="absolute inset-0" style={{ backgroundColor: "hsl(var(--background))" }} />;
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
          <div className="absolute inset-0" style={{ backgroundColor: "hsl(var(--background) / 0.72)" }} />
        </div>
      )}

      <div className="relative z-10 w-full max-w-[1100px] mx-auto px-6 sm:px-8 py-20 flex min-h-0 flex-1 flex-col justify-center items-center text-center">
        {/*
          Structured hero block — a single vertical rhythm stack for the
          eyebrow, headline, tagline, subtitle and body. Spacing is crisp
          and consistent instead of vh-driven, keeping the layout clean at
          every breakpoint while the headline stays poster-sized.
        */}
        <div className="flex flex-col items-center gap-6">
          {leading}
          {c.label && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.2, ease }}
              className="font-body tracking-[0.32em] uppercase flex-shrink-0"
              style={{ color: "hsl(var(--hero-label))", fontSize: "var(--fs-hero-label)" }}>
              <Field fieldPath="label" as="span">
                {c.label}
              </Field>
            </motion.p>
          )}

          <h1
            className="font-display font-black leading-[0.9] tracking-tight flex-shrink-0"
            style={{ color: "hsl(var(--hero-title))", fontSize: "var(--fs-hero-title)" }}>
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
              className="font-body tracking-[0.28em] uppercase flex-shrink-0"
              style={{ color: c.tagline_color || "hsl(var(--hero-label))", fontSize: "var(--fs-hero-label)" }}>
              <Field fieldPath="tagline" as="span">
                {c.tagline}
              </Field>
            </motion.p>
          )}

          {c.subtitle && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1, ease }}
              className="flex-shrink-0">
              <Field
                fieldPath="subtitle"
                as="p"
                className="leading-tight max-w-[600px] mx-auto"
                style={{
                  fontFamily: "'Architects Daughter', cursive",
                  color: c.subtitle_color || "hsl(var(--hero-body))",
                  fontSize: "var(--fs-hero-subtitle)",
                }}>
                {c.subtitle}
              </Field>
            </motion.div>
          )}

          {c.body && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.1, ease }}
              className="flex-shrink-0">
              <Field
                fieldPath="body"
                html
                as="div"
                className="font-body max-w-[640px] mx-auto leading-relaxed"
                style={{ color: "hsl(var(--hero-body))", opacity: 0.75, fontSize: "var(--fs-hero-body)" }}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.body) }}
              />
            </motion.div>
          )}

          {trailing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.2, ease }}
              className="flex-shrink-0">
              {trailing}
            </motion.div>
          )}
        </div>

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

