/**
 * CoverFadeImage — a decorative photo that dissolves into whatever sits
 * behind it via an alpha mask.
 *
 * Two fades:
 * - "hold": fully opaque through the top ~45%, then out to transparent
 *   by the bottom. The original recipe, extracted from BlogPost.tsx's
 *   article banner; still used there and by the FAQ cover card.
 * - "linear": 100% at the very first pixel down to 0% at the last, no
 *   opaque hold. Used for row-level covers and flush row cover cards,
 *   where the picture must read as dissolving into the row from the
 *   top rather than as a banner that suddenly starts fading.
 *
 * The mask is applied to this component's own box, not the <img>. The
 * callers cap the visible band with a max-height and clip the overflow,
 * and the image inside keeps its natural height; masking the image
 * meant the fade was measured against the full (partly hidden) picture,
 * so a tall photo was cut off before its fade reached transparent — an
 * abrupt bottom edge. Masking the visible box makes "0% at the bottom"
 * mean the bottom the visitor actually sees.
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
import { FADE_GRADIENTS, type CoverFade } from "./coverFade";

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
  /** Which alpha fade to apply (see the header comment). Defaults to "hold". */
  fade?: CoverFade;
  /** Extra classes on the outer container (e.g. a max-height clamp, or a responsive aspect-ratio when `fillParent` is set). */
  className?: string;
  /** Inline styles applied to the inner <img> element. */
  style?: React.CSSProperties;
}

const CoverFadeImage = ({
  src,
  alt,
  aspectRatio = 16 / 9,
  fillParent = false,
  roundedTop = false,
  radius = "var(--radius)",
  fade = "hold",
  className = "",
  style,
}: CoverFadeImageProps) => {
  const gradient = FADE_GRADIENTS[fade];
  return (
    <div
      data-cover-fade={fade}
      className={`relative w-full overflow-hidden ${fillParent ? "h-full" : ""} ${className}`}
      style={{
        ...(fillParent ? {} : { aspectRatio }),
        borderRadius: roundedTop ? `${radius} ${radius} 0 0` : 0,
        WebkitMaskImage: gradient,
        maskImage: gradient,
      }}
    >
      <img
        src={transformImageUrl(src, { width: 1920, aspectRatio })}
        srcSet={buildImageSrcSet(src, undefined, 75, aspectRatio)}
        sizes="100vw"
        alt={alt}
        className="w-full h-full object-cover"
        style={style}
      />
    </div>
  );
};

export default CoverFadeImage;
