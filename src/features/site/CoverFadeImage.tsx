/**
 * CoverFadeImage — a decorative photo that dissolves into whatever sits
 * behind it via a fixed 5-stop alpha mask: fully opaque through the top
 * two-thirds, then fading out to fully transparent by the bottom edge.
 *
 * Extracted from BlogPost.tsx's article-header banner so the exact same
 * effect can be reused elsewhere (a boxed row's optional cover image)
 * without a second inline copy of the gradient recipe.
 *
 * NOT interchangeable with Blog.tsx's card-cover treatment (BlogCard in
 * src/pages/Blog.tsx) — that one is a tone-aware CONTRAST overlay for
 * text sitting directly on top of the image (see useImageTone.ts), with
 * a different gradient, different stop count, and a different job. This
 * component has no text-legibility logic at all; it's a purely
 * decorative dissolve with nothing overlaid on the image. Keep the two
 * separate — do not try to unify them.
 */
import { transformImageUrl, buildImageSrcSet } from "@/services/mediaOptimization";

const FADE_GRADIENT =
  "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 45%, rgba(0,0,0,0.6) 68%, rgba(0,0,0,0.2) 85%, rgba(0,0,0,0) 100%)";

interface CoverFadeImageProps {
  src: string;
  /**
   * Required, no default — this component refuses to render without
   * real alt text so it can never ship a silently-decorative image.
   */
  alt: string;
  /**
   * Aspect ratio (width / height) — always used to size the CDN
   * transform request correctly (see mediaOptimization.ts's own doc
   * comment on why this matters), and, unless `fillParent` is set, also
   * applied as this component's own CSS aspect-ratio. Defaults to
   * BlogPost's own banner ratio.
   */
  aspectRatio?: number;
  /**
   * When true, this component fills its parent (`w-full h-full`)
   * instead of setting its own `aspect-ratio` style — use this when the
   * CALLER's own wrapper needs a RESPONSIVE shape (different at mobile
   * vs. desktop) that a single fixed number here can't express. Pass
   * the TALLEST of the shapes you'll actually display as `aspectRatio`
   * regardless, so the requested source has enough height for every
   * breakpoint's crop without the browser ever needing to upscale.
   */
  fillParent?: boolean;
  /** True when this sits at the top of a rounded card — rounds only the top two corners. */
  roundedTop?: boolean;
  /**
   * Corner radius to use when `roundedTop` is set, as a CSS length (e.g.
   * "48px"). Defaults to `var(--radius)` — pass an explicit value when the
   * caller needs this to match a SPECIFIC surrounding curve (e.g. a row's
   * own shapeTop/shapeBottom size) rather than the generic card radius.
   */
  radius?: string;
  /** Extra classes on the outer container (e.g. a max-height clamp, or a responsive aspect-ratio when `fillParent` is set). */
  className?: string;
}

const CoverFadeImage = ({
  src,
  alt,
  aspectRatio = 16 / 9,
  fillParent = false,
  roundedTop = false,
  radius = "var(--radius)",
  className = "",
}: CoverFadeImageProps) => (
  <div
    className={`relative w-full overflow-hidden ${fillParent ? "h-full" : ""} ${className}`}
    style={{
      ...(fillParent ? {} : { aspectRatio }),
      borderRadius: roundedTop ? `${radius} ${radius} 0 0` : 0,
    }}
  >
    <img
      src={transformImageUrl(src, { width: 1920, aspectRatio })}
      srcSet={buildImageSrcSet(src, undefined, 75, aspectRatio)}
      sizes="100vw"
      alt={alt}
      className="w-full h-full object-cover"
      style={{
        WebkitMaskImage: FADE_GRADIENT,
        maskImage: FADE_GRADIENT,
      }}
    />
  </div>
);

export default CoverFadeImage;
