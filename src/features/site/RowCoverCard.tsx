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
}

const RowCoverCard = ({ row, children }: RowCoverCardProps) => {
  const coverImage = row.content?.cover_image?.trim() || undefined;
  const coverImageAlt = row.content?.cover_image_alt || "";

  if (!coverImage) return <>{children}</>;

  const shapeSize =
    (row.layout?.shapeTop as any)?.size || (row.layout?.shapeBottom as any)?.size || "medium";
  const radiusPx = `${ROUNDED_PX[(shapeSize as keyof typeof ROUNDED_PX) || "medium"]}px`;

  return (
    <div
      style={{
        borderRadius: radiusPx,
        boxShadow: "var(--shadow-soft)",
        background: "var(--gradient-card)",
        overflow: "hidden",
        // Reset the row-level readable-text-colour override: --row-fg was
        // set by the ancestor RowSection for the ROW's own background
        // (e.g. a dark bg_color, giving light text) and would otherwise
        // cascade in here uncontested, making title/subtitle/eyebrow text
        // render in a colour meant for a dark background on top of THIS
        // container's light --gradient-card instead. CUSTOM properties
        // are inherited by default, so `unset` on one means "inherit the
        // parent's value" — a no-op. `initial` is what actually resets to
        // the guaranteed-invalid value that makes every descendant's own
        // `var(--row-fg, fallback)` correctly fall through to its own
        // default instead.
        ["--row-fg" as string]: "initial",
        ["--row-fg-muted" as string]: "initial",
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
      {/* Negative margin pulls the title up into the image's own fade zone
          (its top ~45% stays fully opaque, so text landing just past that
          edge is still on solid ground) instead of starting flush below it. */}
      <div className="relative z-10 p-6 md:p-8 lg:p-10 -mt-16 md:-mt-20">{children}</div>
    </div>
  );
};

export default RowCoverCard;
