/**
 * TextRowEditor — Inspector-friendly editor for legacy "text" widgets.
 *
 * Mirrors the field layout used by RowContentEditor's `case "text"` block
 * but exposes a `{ content, onChange }` signature suitable for the
 * widget-level Inspector panel.
 */

import { RichField, EyebrowField, NoteField, Field, MoreFields } from "./FieldComponents";
import { CoverImageField } from "./CoverImageField";
import SubtitleEditor from "./SubtitleEditor";
import TitleLinesEditor from "../editors/TitleLinesEditor";

interface Props {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
  bgColor?: string;
}

const TextRowEditor = ({ content, onChange, bgColor }: Props) => {

  return (
    <div className="space-y-3">
      <EyebrowField value={content.eyebrow || ""} color={content.color_eyebrow || ""} onChange={(v) => onChange("eyebrow", v)} onColorChange={(v) => onChange("color_eyebrow", v)} />
      <TitleLinesEditor titleLines={content.title_lines || []} onChange={(v) => onChange("title_lines", v)} bgColor={bgColor} />
      <SubtitleEditor
        subtitle={content.subtitle || ""}
        subtitleColor={content.subtitle_color || ""}
        onSubtitleChange={(v) => onChange("subtitle", v)}
        onColorChange={(v) => onChange("subtitle_color", v)}
        handwritten={!!content.subtitle_handwritten}
        onHandwrittenChange={(v) => onChange("subtitle_handwritten", v)}
        bgColor={bgColor}
      />
      <RichField label="Body" value={content.body || ""} onChange={(v) => onChange("body", v)} bgColor={bgColor} />
      <NoteField value={content.note || ""} onChange={(v) => onChange("note", v)} />
      <CoverImageField content={content} onChange={onChange} shape />
      {/* The fold: words kept on the page but closed until a reader opens them. */}
      <MoreFields label="Fold (text that opens on click)">
        <Field label="Fold button text" value={content.fold_label || ""} onChange={(v) => onChange("fold_label", v)} hint="For example: Read the whole story" />
        <RichField label="Text inside the fold" value={content.folded_body || ""} onChange={(v) => onChange("folded_body", v)} bgColor={bgColor} />
        <RichField label="Text after the fold" value={content.body_after || ""} onChange={(v) => onChange("body_after", v)} bgColor={bgColor} />
      </MoreFields>
    </div>
  );
};

export default TextRowEditor;
