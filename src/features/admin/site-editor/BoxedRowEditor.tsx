/**
 * BoxedRowEditor — Inspector-friendly editor for legacy "boxed" widgets.
 *
 * Mirrors the field layout used by RowContentEditor's `case "boxed"` block
 * but exposes a `{ content, onChange }` signature suitable for the
 * widget-level Inspector panel.
 */

import { Field, ColorField } from "./FieldComponents";
import SubtitleEditor from "./SubtitleEditor";
import TitleLinesEditor from "../editors/TitleLinesEditor";
import BoxedArrayField from "../editors/BoxedArrayField";
import ImagePickerField from "../ImagePickerField";

interface Props {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
  bgColor?: string;
}

const BoxedRowEditor = ({ content, onChange, bgColor }: Props) => {
  const titleLines = (content.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`,
  );

  return (
    <div className="space-y-3">
      <TitleLinesEditor titleLines={titleLines} onChange={(v) => onChange("title_lines", v)} bgColor={bgColor} />
      <SubtitleEditor
        subtitle={content.subtitle || ""}
        subtitleColor={content.subtitle_color || ""}
        onSubtitleChange={(v) => onChange("subtitle", v)}
        onColorChange={(v) => onChange("subtitle_color", v)}
        bgColor={bgColor}
      />
      <BoxedArrayField content={content} onChange={onChange} bgColor={bgColor} />
      <Field label="Eyebrow" value={content.eyebrow || ""} onChange={(v) => onChange("eyebrow", v)} />
      <Field label="Note (optional)" value={content.note || ""} onChange={(v) => onChange("note", v)} />
      {/* Optional cover image (RowCoverCard, src/features/site/RowCoverCard.tsx)
          — wraps eyebrow/title/subtitle/cards in a photo-card treatment
          when set. Leave empty and the row renders exactly as before. */}
      <ImagePickerField
        label="Cover Image (optional)"
        value={content.cover_image || ""}
        onChange={(v) => onChange("cover_image", v)}
        altValue={content.cover_image_alt || ""}
        onAltChange={(v) => onChange("cover_image_alt", v)}
      />
      <div className="grid grid-cols-2 gap-3">
        <ColorField
          label="Eyebrow colour"
          value={content.color_eyebrow || ""}
          fallback=""
          onChange={(v) => onChange("color_eyebrow", v)}
        />
        <ColorField
          label="Note colour"
          value={content.color_note || ""}
          fallback=""
          onChange={(v) => onChange("color_note", v)}
        />
      </div>
      <ColorField label="Card Title Color" value={content.color_card_title || ""} fallback="" onChange={(v) => onChange("color_card_title", v)} />
      <ColorField label="Card Body Color" value={content.color_card_body || ""} fallback="" onChange={(v) => onChange("color_card_body", v)} />
    </div>
  );
};

export default BoxedRowEditor;
