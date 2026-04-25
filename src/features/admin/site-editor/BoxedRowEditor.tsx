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

interface Props {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

const BoxedRowEditor = ({ content, onChange }: Props) => {
  const titleLines = (content.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`,
  );

  return (
    <div className="space-y-3">
      <TitleLinesEditor titleLines={titleLines} onChange={(v) => onChange("title_lines", v)} />
      <SubtitleEditor
        subtitle={content.subtitle || ""}
        subtitleColor={content.subtitle_color || ""}
        onSubtitleChange={(v) => onChange("subtitle", v)}
        onColorChange={(v) => onChange("subtitle_color", v)}
      />
      <BoxedArrayField content={content} onChange={onChange} />
      <Field label="Eyebrow" value={content.eyebrow || ""} onChange={(v) => onChange("eyebrow", v)} />
      <Field label="Note (optional)" value={content.note || ""} onChange={(v) => onChange("note", v)} />
      <ColorField label="Card Title Color" value={content.color_card_title || ""} fallback="" onChange={(v) => onChange("color_card_title", v)} />
      <ColorField label="Card Body Color" value={content.color_card_body || ""} fallback="" onChange={(v) => onChange("color_card_body", v)} />
    </div>
  );
};

export default BoxedRowEditor;
