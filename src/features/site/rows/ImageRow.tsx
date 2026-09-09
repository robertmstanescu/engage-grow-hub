/**
 * ImageRow — strict, accessibility-first image widget.
 *
 * EPIC 13 / US 13.1 — every published image must carry meaningful
 * alt text. This widget:
 *   • renders ONLY `<img src={data.url} alt={data.alt_text} />` (no
 *     decorative wrappers that obscure the alt requirement);
 *   • exposes an admin editor that requires both fields;
 *   • is paired with a publish-time validator (see
 *     `src/services/contentAccessibility.ts`) that blocks Publish when
 *     any image widget on the page is missing alt text.
 *
 * Asset-library coupling
 * ----------------------
 * The admin picker writes both the public URL (so the renderer stays
 * pure) AND the source `media_assets.id` into `content.asset_id` when
 * the image was chosen from the gallery. Storing the id lets future
 * features (auto-refresh on rename, usage tracking, batch alt-text
 * audits) join back to the canonical row without re-parsing URLs.
 */
import type { PageRow } from "@/types/rows";
import RowSection from "./typography/RowSection";
import { transformImageUrl, buildImageSrcSet } from "@/services/mediaOptimization";
import { resolveAspectRatio, focalObjectPosition } from "@/lib/imageShape";

/* ---------- shared content shape -------------------------------- */
export interface ImageRowContent {
  url: string;
  alt_text: string;
  asset_id?: string | null;
  caption?: string;
  /** Shared shape preset — see src/lib/imageShape.ts. */
  ratio?: string;
  /** Focal point as percentages (0–100); defaults to the centre. */
  focal_x?: number;
  focal_y?: number;
}

export const IMAGE_ROW_DEFAULT: ImageRowContent = {
  url: "",
  alt_text: "",
  asset_id: null,
  caption: "",
};

/* ---------- public renderer ------------------------------------- */
interface FrontendProps {
  row: PageRow;
}

const FOCAL: Record<string, string> = {
  top: "center top",
  center: "center center",
  bottom: "center bottom",
  left: "left center",
  right: "right center",
};

const ImageRow = ({ row }: FrontendProps) => {
  const data = (row.content || {}) as ImageRowContent;
  if (!data.url) return null;

  /* Image rows are page breakers by default: edge-to-edge, no padding. */
  const bleed = row.layout?.fullBleed !== false;
  /* With an admin-chosen height the picture fills the band and crops;
     on auto height it keeps its natural ratio. */
  const cropped = Boolean(row.layout?.heightMode && row.layout.heightMode !== "auto");
  /* Percentage focal point wins when the admin picked one; otherwise we
     fall back to the legacy top/center/bottom/left/right layout value. */
  const hasPercentFocal = typeof data.focal_x === "number" || typeof data.focal_y === "number";
  const objectPosition = hasPercentFocal
    ? focalObjectPosition(data.focal_x, data.focal_y)
    : FOCAL[row.layout?.focalPoint || "center"];
  const presetAspect = resolveAspectRatio(data.ratio);

  return (
    <RowSection row={row as any} bleed={bleed} maskShapes exactHeight={cropped}>
      <figure
        className={`relative z-10 w-full ${
          bleed ? "self-stretch flex-1 flex flex-col min-h-0" : "row-container mx-auto max-w-[1280px]"
        }`}
      >
        {/* Per acceptance criteria — strict element, no rewrites (the
            src is CDN-transformed for size/format, not decoratively
            wrapped — alt text is still exactly what the admin set). */}
        <img
          src={transformImageUrl(data.url, { width: 1920 })}
          srcSet={buildImageSrcSet(data.url)}
          sizes={bleed ? "100vw" : "(min-width: 1280px) 1280px, 100vw"}
          alt={data.alt_text || ""}
          className={cropped || presetAspect ? "w-full h-full flex-1 min-h-0 object-cover" : "w-full h-auto"}
          style={{
            objectPosition,
            ...(presetAspect && !cropped ? { aspectRatio: String(presetAspect), height: "auto" } : null),
            /* Ink outline on a contained picture; a full-bleed page
               breaker is the row's own surface and follows the row rules. */
            ...(bleed ? null : { border: "var(--outline-ink-border)", borderRadius: "var(--radius)" }),
          }}
          loading="lazy"
        />
        {data.caption ? (
          <figcaption
            className={
              cropped
                ? "absolute bottom-3 left-0 right-0 row-container mx-auto max-w-[1280px] text-xs font-body text-center text-white drop-shadow"
                : "mt-2 text-xs row-fg-muted font-body text-center"
            }
          >
            {data.caption}
          </figcaption>
        ) : null}
      </figure>
    </RowSection>
  );
};

export default ImageRow;
