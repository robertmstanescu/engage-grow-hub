/**
 * RowCoverCard — wraps a single-widget row's content in an optional
 * cover picture.
 *
 * - "flush" (default): the picture sits flush at the top of the row,
 *   clipped to the row's corner curve, and dissolves into the row's
 *   own background. No card, no shadow, no padding.
 * - "card": the legacy FAQ treatment — padded light card with a soft
 *   shadow and the content overlapping the fade.
 *
 * The picture's display ratio is driven by `content.cover_image_ratio`
 * (defaulting to the file's natural proportions). The focal point is
 * read from `content.cover_image_focal_x/y`. The band height is a
 * row-level choice from `layout.coverHeight`.
 */
import type { PageRow } from "@/types/rows";
import CoverFadeImage from "./CoverFadeImage";
import { transformImageUrl } from "@/services/mediaOptimization";
import { focalObjectPosition, resolveAspectRatio } from "@/lib/imageShape";

const ROUNDED_PX = { none: 0, subtle: 16, medium: 24, dramatic: 48 } as const;
/** Radius of the "card" variant when the row has no explicit Corners choice. */
const CARD_DEFAULT_RADIUS = 48;

const COVER_HEIGHTS: Record<"small" | "medium" | "large", { maxH: string }> = {
  small: { maxH: "clamp(180px, 22vh, 260px)" },
  medium: { maxH: "clamp(260px, 32vh, 380px)" },
  large: { maxH: "clamp(360px, 42vh, 520px)" },
};

interface RowCoverCardProps {
  row: PageRow;
  children: React.ReactNode;
  /**
   * "flush" (default): the picture dissolves straight into the row's own
   * surface — no card, no shadow, no padding.
   * "card": the legacy treatment — the picture and content sit inside a
   * padded light card with a soft shadow. FAQ rows opted back into this.
   */
  variant?: "flush" | "card";
}

const RowCoverCard = ({ row, children, variant = "flush" }: RowCoverCardProps) => {
  const coverImage = row.content?.cover_image?.trim() || undefined;
  const coverImageAlt = row.content?.cover_image_alt || "";

  if (!coverImage) return <>{children}</>;

  const isCard = variant === "card";
  // An explicit Style ▸ Corners choice always wins. Without one, the
  // "flush" picture follows the row's box (square by default, so it never
  // fights an edge shape — see RowSection). The "card" variant is its own
  // inner surface with a shadow, so it keeps the rounded look it always
  // had (48px, the old "medium") instead of turning square when the row
  // default changed to none; an inner card cannot clash with an edge cap.
  const radiusKey = row.layout?.surfaceRadius;
  const radiusPx = `${radiusKey ? (ROUNDED_PX[radiusKey] ?? 0) : isCard ? CARD_DEFAULT_RADIUS : 0}px`;
  const heightKey = row.layout?.coverHeight || "small";
  const maxHeight = COVER_HEIGHTS[heightKey]?.maxH || COVER_HEIGHTS.small.maxH;
  const objectPosition = focalObjectPosition(
    row.content?.cover_image_focal_x,
    row.content?.cover_image_focal_y,
  );
  const aspectRatio = resolveAspectRatio(row.content?.cover_image_ratio);

  return (
    <div
      style={{
        borderRadius: radiusPx,
        overflow: "hidden",
        ...(isCard
          ? { boxShadow: "var(--shadow-soft)", background: "var(--gradient-card)" }
          : null),
      }}
    >
      <div
        className="w-full overflow-hidden"
        style={{
          borderRadius: `${radiusPx} ${radiusPx} 0 0`,
          maxHeight,
          aspectRatio: aspectRatio ? String(aspectRatio) : undefined,
        }}
      >
        <CoverFadeImage
          src={coverImage}
          alt={coverImageAlt}
          roundedTop={false}
          fillParent
          aspectRatio={aspectRatio ?? 16 / 9}
          // Flush covers dissolve into the row from the first pixel; the
          // FAQ card keeps its banner-style hold before fading.
          fade={isCard ? "hold" : "linear"}
          className="h-auto"
          style={{ objectPosition }}
        />
      </div>
      <div
        className={`relative z-10 ${isCard ? "px-8 py-6 md:p-8 lg:p-10" : "px-6 md:px-8 lg:px-10 pt-6 md:pt-8"}`}
      >
        {children}
      </div>
    </div>
  );
};

export default RowCoverCard;
