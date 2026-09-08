/**
 * CoverImageField — the optional row-level cover picture (RowCoverCard,
 * src/features/site/RowCoverCard.tsx) that wraps a row's header and
 * content in a photo-card treatment when set. Leave it empty and the row
 * renders exactly as before.
 *
 * Reads/writes `cover_image`, `cover_image_alt` and, when `shape` is on,
 * `cover_image_ratio` / `cover_image_focal_x` / `cover_image_focal_y`.
 * Only renderers that honour the ratio and focal point (text, boxed)
 * should pass `shape`; the picker hides those controls otherwise.
 *
 * Six editors carried their own copy of this block before; keep the
 * key names here the single source of truth.
 */
import ImagePickerField from "../ImagePickerField";

export const CoverImageField = ({
  content,
  onChange,
  shape = false,
}: {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
  /** Expose ratio + focal-point controls (renderer must support them). */
  shape?: boolean;
}) => (
  <ImagePickerField
    label="Cover Image (optional)"
    value={content.cover_image || ""}
    onChange={(v) => onChange("cover_image", v)}
    altValue={content.cover_image_alt || ""}
    onAltChange={(v) => onChange("cover_image_alt", v)}
    {...(shape
      ? {
          ratio: content.cover_image_ratio || "original",
          focalX: content.cover_image_focal_x,
          focalY: content.cover_image_focal_y,
          onShapeChange: (patch: { ratio?: string; focalX?: number; focalY?: number }) => {
            if (patch.ratio !== undefined) onChange("cover_image_ratio", patch.ratio);
            if (patch.focalX !== undefined) onChange("cover_image_focal_x", patch.focalX);
            if (patch.focalY !== undefined) onChange("cover_image_focal_y", patch.focalY);
          },
        }
      : {})}
  />
);

export default CoverImageField;
