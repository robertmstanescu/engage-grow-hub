/**
 * RowCoverImage — the OPTIONAL cover picture that belongs to a whole row.
 *
 * - Renders at the uploaded photo's natural aspect ratio, capped by a
 *   per-row height setting (small/medium/large) so rows stay compact.
 * - The cover sits flush at the top of the row and its top corners are
 *   clipped to the row's own corner curve.
 * - "fade" mode dissolves into the row colour; "fill" mode is a plain
 *   photo band.
 */
import type { RowLayout } from "@/types/rows";
import CoverFadeImage from "../CoverFadeImage";
import { transformImageUrl } from "@/services/mediaOptimization";
import { focalObjectPosition, resolveAspectRatio } from "@/lib/imageShape";

const ROUNDED_PX = { none: 0, subtle: 16, medium: 24, dramatic: 48 } as const;

export const rowCoverRadius = (layout?: RowLayout) => {
  const radiusKey = layout?.surfaceRadius || "none";
  return `${ROUNDED_PX[radiusKey] ?? 0}px`;
};

const COVER_HEIGHTS: Record<"small" | "medium" | "large", { maxH: string; label: string }> = {
  small: { maxH: "clamp(180px, 22vh, 260px)", label: "Small" },
  medium: { maxH: "clamp(260px, 32vh, 380px)", label: "Medium" },
  large: { maxH: "clamp(360px, 42vh, 520px)", label: "Large" },
};

interface Props {
  src: string;
  alt: string;
  layout?: RowLayout;
}

const RowCoverImage = ({ src, alt, layout }: Props) => {
  const radius = rowCoverRadius(layout);
  const mode = layout?.coverMode || "fade";
  const heightKey = layout?.coverHeight || "small";
  const maxHeight = COVER_HEIGHTS[heightKey]?.maxH || COVER_HEIGHTS.small.maxH;
  const objectPosition = focalObjectPosition(layout?.coverFocalX, layout?.coverFocalY);
  const aspectRatio = resolveAspectRatio(layout?.coverImageRatio);

  if (mode === "fill") {
    return (
      <div
        className="w-full overflow-hidden"
        style={{
          borderRadius: `${radius} ${radius} 0 0`,
          maxHeight,
          aspectRatio: aspectRatio ? String(aspectRatio) : undefined,
        }}
      >
        <img
          src={transformImageUrl(src, { width: 1920 })}
          alt={alt}
          loading="lazy"
          className="w-full h-auto object-cover"
          style={{ objectPosition }}
        />
      </div>
    );
  }

  return (
    <div
      className="w-full overflow-hidden"
      style={{
        borderRadius: `${radius} ${radius} 0 0`,
        maxHeight,
        aspectRatio: aspectRatio ? String(aspectRatio) : undefined,
      }}
    >
      <CoverFadeImage
        src={src}
        alt={alt}
        roundedTop={false}
        fillParent
        aspectRatio={aspectRatio ?? 16 / 9}
        // A row cover dissolves into the row from its very first pixel
        // (100% → 0% top to bottom), not after an opaque banner strip.
        fade="linear"
        className="h-auto"
        style={{ objectPosition }}
      />
    </div>
  );
};

export default RowCoverImage;
