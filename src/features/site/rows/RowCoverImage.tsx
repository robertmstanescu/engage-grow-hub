/**
 * RowCoverImage — the OPTIONAL cover picture that belongs to a whole row
 * (not to a single widget). It spans the row's full width, inherits the
 * row's corner curve (same ROUNDED_PX scale the edge shapes use) and, in
 * "fade" mode, dissolves into the row's own background colour via
 * CoverFadeImage.
 *
 * The per-widget cover (RowCoverCard) is unchanged and still used by
 * single-widget rows such as FAQ, which deliberately keeps its padded
 * card treatment.
 */
import type { RowLayout } from "@/types/rows";
import CoverFadeImage from "../CoverFadeImage";
import { transformImageUrl } from "@/services/mediaOptimization";

const ROUNDED_PX = { subtle: 24, medium: 48, dramatic: 80 } as const;

export const rowCoverRadius = (layout?: RowLayout) => {
  const size =
    (layout?.shapeTop as { size?: keyof typeof ROUNDED_PX } | undefined)?.size ||
    (layout?.shapeBottom as { size?: keyof typeof ROUNDED_PX } | undefined)?.size ||
    "medium";
  return `${ROUNDED_PX[size] ?? ROUNDED_PX.medium}px`;
};

interface Props {
  src: string;
  alt: string;
  layout?: RowLayout;
}

const RowCoverImage = ({ src, alt, layout }: Props) => {
  const radius = rowCoverRadius(layout);
  const mode = layout?.coverMode || "fade";

  if (mode === "fill") {
    return (
      <div
        className="w-full overflow-hidden aspect-[3/2] md:aspect-[21/6]"
        style={{ borderRadius: radius }}
      >
        <img
          src={transformImageUrl(src, { width: 1920 })}
          alt={alt}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="w-full aspect-[3/2] md:aspect-[21/6]">
      <CoverFadeImage
        src={src}
        alt={alt}
        roundedTop
        fillParent
        aspectRatio={3 / 2}
        radius={radius}
      />
    </div>
  );
};

export default RowCoverImage;
