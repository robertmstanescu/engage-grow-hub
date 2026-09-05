import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { sanitizeHtml } from "@/services/sanitize";
import EditableText from "@/features/admin/EditableText";
import Icon from "@/features/icons/Icon";
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
  /**
   * Optional small foreground photo card next to the text — separate
   * from `bg_type`/`bg_url` (the full-bleed background). Not mutually
   * exclusive in the data model, but only one is expected in use on any
   * given hero at a time. Both fields are required together: there is
   * no rendering path that shows the image without its alt text.
   */
  visual_image_url?: string;
  visual_image_alt?: string;
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
 * useFitTitleLines — keeps EVERY hero title line on one line, at ONE
 * shared font size.
 *
 * History / why it looks like this:
 * The previous implementation measured and shrank each line
 * INDIVIDUALLY, and measured by appending a clone inside the live <h1>
 * that a ResizeObserver was watching. That produced two bugs the owner
 * saw: (1) lines rendered at different sizes, (2) measure → shrink →
 * observer fires → measure … a visible flicker loop.
 *
 * Now:
 * • Measurement happens in a probe attached to document.body, OUTSIDE
 *   the observed <h1>, so measuring can never retrigger the observer.
 * • The widest line decides ONE scale factor for the whole heading, set
 *   as --hero-fit-scale, so all lines share a size.
 * • We observe the WIDTH of the <h1>'s parent container and the window,
 *   never the <h1>'s own height — plus a hysteresis threshold, so tiny
 *   sub-pixel differences can't oscillate.
 */
const useFitTitleLines = (lineCount: number) => {
  const h1Ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const h1 = h1Ref.current;
    if (!h1) return;
    let raf = 0;
    let applied = 1;

    const fit = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        /* Measure the CONSTRAINING box (the parent), not the <h1>:
           with white-space:nowrap the heading itself can overflow, and a
           width that grows with the content is exactly what made the
           scale oscillate. */
        const avail = Math.min(
          h1.clientWidth || Infinity,
          h1.parentElement?.clientWidth || Infinity,
        );
        if (!Number.isFinite(avail)) return;
        if (!avail) return;

        const cs = getComputedStyle(h1);
        /* Natural (unscaled) font size = the fluid --fs-hero-title. Read
           it from the CSS variable so the current scale can't feed back
           into the measurement. */
        /* Computed fontSize is `--fs-hero-title * applied scale` in px,
           so dividing by the scale we set recovers the natural fluid
           size without re-reading the raw clamp() token (custom
           properties come back unresolved). */
        const natural = parseFloat(cs.fontSize) / (applied || 1);

        const probe = document.createElement("div");
        probe.style.cssText =
          "position:absolute;left:-99999px;top:0;visibility:hidden;pointer-events:none;white-space:nowrap;";
        probe.style.fontFamily = cs.fontFamily;
        probe.style.fontWeight = cs.fontWeight;
        probe.style.fontStyle = cs.fontStyle;
        probe.style.letterSpacing = cs.letterSpacing;
        probe.style.fontSize = `${natural}px`;

        h1.querySelectorAll<HTMLElement>("span.block").forEach((line) => {
          const clone = line.cloneNode(true) as HTMLElement;
          clone.style.display = "block";
          clone.style.fontSize = "";
          probe.appendChild(clone);
        });
        document.body.appendChild(probe);
        const widths: number[] = [];
        probe.querySelectorAll<HTMLElement>(":scope > *").forEach((el) => {
          widths.push(el.scrollWidth);
        });
        document.body.removeChild(probe);

        if (!widths.length || !widths.some((w) => w > 0)) return;

        /* PAD keeps a visible breathing gap on both sides at whatever
           size we land on (the old 4px guard only covered sub-pixel
           rounding, so lines kissed the edges). */
        const PAD = avail < 640 ? 12 : 32;
        const usable = Math.max(0, avail - PAD);

        /* Legibility floor — how small the whole heading may go in order
           to keep a line whole. A line that cannot fit even at the floor
           (a long opening sentence) is excluded from the calculation and
           wraps on its own; every other line stays unbroken and ALL
           lines share the single resulting size. */
        const FLOOR = avail < 640 ? 0.35 : 0.42;
        const ratios = widths.map((w) => (w > 0 ? usable / w : Infinity));
        const feasible = ratios.filter((r) => Number.isFinite(r) && r >= FLOOR);
        let scale = feasible.length ? Math.min(1, Math.min(...feasible)) : FLOOR;
        /* floor, never round up — rounding up re-introduces a 1-2px
           overflow that clips the last glyph. */
        scale = Math.max(FLOOR, Math.floor(scale * 100) / 100);

        if (Math.abs(scale - applied) > 0.009) {
          applied = scale;
          h1.style.setProperty("--hero-fit-scale", String(scale));
        }
        /* Wrapping is decided PER LINE: only a line that cannot fit at
           the floor is allowed to break. Previously a single over-long
           line switched the whole heading to wrapping, which let short
           key lines ("We bring the coffin.") break too. */
        h1.style.whiteSpace = "normal";
        h1.querySelectorAll<HTMLElement>("span.block").forEach((line, i) => {
          const r = ratios[i];
          const wraps = Number.isFinite(r) && r < FLOOR;
          line.style.whiteSpace = wraps ? "normal" : "nowrap";
          /* A line that must wrap would otherwise fill the whole box and
             kiss the edges before breaking. Cap its width at ~60% of its
             natural (scaled) width so it breaks near the middle into two
             balanced lines with breathing room on both sides. */
          if (wraps) {
            const scaledW = widths[i] * scale;
            line.style.maxWidth = `${Math.min(usable, Math.ceil(scaledW * 0.6))}px`;
            /* Wide screens with a foreground visual left-align the text
               column (see the container classes below) — a wrapped line
               must hug the left edge there instead of centering. */
            line.style.marginInline = leftAlign ? "0 auto" : "auto";
          } else {
            line.style.maxWidth = "";
            line.style.marginInline = "";
          }
        });


      });
    };

    fit();
    /* Observe the PARENT's width (what actually constrains the title),
       never the <h1>'s own box — the <h1>'s height changes when we
       rescale, which is what created the old feedback loop. */
    const ro = new ResizeObserver(fit);
    if (h1.parentElement) ro.observe(h1.parentElement);
    window.addEventListener("resize", fit);
    /* Re-fit once webfonts finish loading — metrics change when the
       display font swaps in. */
    (document as any).fonts?.ready?.then(fit);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [lineCount]);

  return h1Ref;
};


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
  // Independent of hasBg/bg_type — a small foreground photo card next to
  // the text, not a full-bleed background. When absent, the layout below
  // renders exactly as it always has (single centred column, no grid).
  const hasVisual = Boolean(c.visual_image_url && c.visual_image_alt);

  /* Per-line shrink-to-fit so no title line ever wraps unintentionally
     (see useFitTitleLines above). */
  const titleRef = useFitTitleLines(titleLines.length);

  /**
   * Cold-load guard — `isLoading` is an explicit prop the caller
   * controls (defaults to false; a hero sourced from an async fetch
   * should pass its own loading state through).
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
            alt={c.bg_image_alt || "Homepage hero background for The Magic Coffin fractional people and comms consultancy"}
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
                  alt={c.bg_image_alt || "Homepage hero background for The Magic Coffin fractional people and comms consultancy"}
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

      <div
        className={
          hasVisual
            ? // A fixed (not fr-based) width for the visual, and `xl:` rather
              // than `md:` for the breakpoint — both deliberate. The title
              // uses the same shrink-to-fit floor as the single-column hero
              // (max 30% shrink before it gives up and lets a line wrap), so
              // the text side needs real room: a 50/50 split at `md:`
              // (768px) leaves so little width that a long word like
              // "organisation" overflows past the 30%-shrink floor with
              // nowhere to wrap to. A fixed ~340px visual plus a wider
              // activation point keeps the text column comfortably above
              // that floor at every width the grid is actually active.
              "relative z-10 w-full max-w-[1280px] mx-auto px-6 sm:px-8 py-20 flex flex-col items-center text-center xl:flex-row xl:items-center gap-10 xl:gap-16"
            : "relative z-10 w-full max-w-[1100px] mx-auto px-6 sm:px-8 py-20 flex min-h-0 flex-1 flex-col justify-center items-center text-center"
        }
      >
        {/*
          Structured hero block — a single vertical rhythm stack for the
          eyebrow, headline, tagline, subtitle and body. Spacing is crisp
          and consistent instead of vh-driven, keeping the layout clean at
          every breakpoint while the headline stays poster-sized.
        */}
        <div className={`flex w-full min-w-0 flex-col items-center gap-6 ${hasVisual ? "xl:flex-1" : ""}`}>

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
            ref={titleRef}
            className="font-display font-black leading-[0.9] tracking-tight flex-shrink-0 w-full"
            style={{
              color: "hsl(var(--hero-title))",
              fontSize: "calc(var(--fs-hero-title) * var(--hero-fit-scale, 1))",
            }}>
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

        {hasVisual && (
          // Entrance timing sits between the title's own stagger (which
          // finishes around 0.3 + (lineCount-1)*0.12 + 0.7 ≈ 1.24s for a
          // 3-line title... but this card isn't part of that stagger chain,
          // it's a separate element — placed at 0.65s specifically so it
          // settles in the gap between the title lines starting (0.3s+)
          // and the tagline fading in (0.8s), same ease curve as every
          // other entrance in this component.
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.65, ease }}
            className="relative mx-auto w-full max-w-sm xl:mx-0 xl:w-[340px] xl:flex-shrink-0"
          >
            <div
              className="relative w-full overflow-hidden"
              style={{
                aspectRatio: "3/4",
                borderRadius: "var(--radius)",
                boxShadow: "var(--shadow-soft)",
              }}
            >
              <img
                src={transformImageUrl(c.visual_image_url!, { width: 800, aspectRatio: 3 / 4 })}
                srcSet={buildImageSrcSet(c.visual_image_url, undefined, 75, 3 / 4)}
                sizes="(min-width: 768px) 40vw, 80vw"
                alt={c.visual_image_alt || ""}
                className="w-full h-full object-cover"
                loading="eager"
                decoding="async"
              />
            </div>
            {/* Decorative mark, overlapping the frame's top-right corner. */}
            <div
              className="absolute flex items-center justify-center rounded-full"
              style={{
                top: "-0.75rem",
                right: "-0.75rem",
                width: "2.75rem",
                height: "2.75rem",
                backgroundColor: "hsl(var(--background))",
                boxShadow: "var(--shadow-soft)",
              }}
            >
              <Icon value="lucide:Sparkles" size={20} color="#E5C54F" />
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};


