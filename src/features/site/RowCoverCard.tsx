/**
 * RowCoverCard — wraps a row's content in an optional "photo card" shell:
 * a CoverFadeImage banner (see CoverFadeImage.tsx) dissolving into a
 * light --gradient-card surface, with the wrapped content's title
 * overlapping the fade's tail end.
 *
 * Extracted from BoxedRow.tsx so any row type can opt into the same
 * treatment by reading `cover_image`/`cover_image_alt` off its own
 * content and wrapping its existing render output in this component —
 * no new row-type-specific styling to invent each time.
 *
 * When `coverImage` is falsy, renders `children` completely unwrapped —
 * a row with no cover image set must render EXACTLY as it did before
 * this component existed.
 */
import type { PageRow } from "@/types/rows";
import CoverFadeImage from "./CoverFadeImage";

// Mirrors RowSection.tsx's own ROUNDED_PX scale exactly (not exported,
// so duplicated here) — the photo-card's corners should read as part of
// the SAME curve system as the row's own shapeTop/shapeBottom, not an
// arbitrary different radius.
const ROUNDED_PX = { subtle: 24, medium: 48, dramatic: 80 } as const;

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

  const shapeSize =
    (row.layout?.shapeTop as any)?.size || (row.layout?.shapeBottom as any)?.size || "medium";
  const radiusPx = `${ROUNDED_PX[(shapeSize as keyof typeof ROUNDED_PX) || "medium"]}px`;

  const isCard = variant === "card";

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
      <div className="aspect-[3/2] md:aspect-[21/6]">
        <CoverFadeImage
          src={coverImage}
          alt={coverImageAlt}
          roundedTop
          fillParent
          aspectRatio={3 / 2}
          radius={radiusPx}
        />
      </div>
      {/* Negative margin pulls the content up into the image's own fade
          zone (its top ~45% stays fully opaque) so the picture dissolves
          straight into the row's own colour — no card, no shadow. */}
      <div className="relative z-10 -mt-16 md:-mt-20">{children}</div>
    </div>
  );
};

export default RowCoverCard;
