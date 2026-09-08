/**
 * BoxedRowEditor — the one editor for "boxed" card rows, used by every
 * admin surface through RowTypeEditor.
 *
 * "Our Vows" is a boxed row too: the separate VowsEditor it once had was
 * a drifting copy of this file (same cards[] + card colours) plus a
 * "Title Color" field that BoxedRow honours (`color_title`) — that field
 * now lives here and the copy is gone.
 */

import { ColorField, EyebrowField, NoteField } from "./FieldComponents";
import { CoverImageField } from "./CoverImageField";
import SubtitleEditor from "./SubtitleEditor";
import TitleLinesEditor from "../editors/TitleLinesEditor";
import BoxedArrayField from "../editors/BoxedArrayField";

interface Props {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
  bgColor?: string;
}

const BoxedRowEditor = ({ content, onChange, bgColor }: Props) => {

  return (
    <div className="space-y-3">
      <EyebrowField
        value={content.eyebrow || ""}
        color={content.color_eyebrow || ""}
        onChange={(v) => onChange("eyebrow", v)}
        onColorChange={(v) => onChange("color_eyebrow", v)}
      />
      <TitleLinesEditor titleLines={content.title_lines || []} onChange={(v) => onChange("title_lines", v)} bgColor={bgColor} />
      <ColorField label="Title Color" value={content.color_title || ""} fallback="" onChange={(v) => onChange("color_title", v)} />
      <SubtitleEditor
        subtitle={content.subtitle || ""}
        subtitleColor={content.subtitle_color || ""}
        onSubtitleChange={(v) => onChange("subtitle", v)}
        onColorChange={(v) => onChange("subtitle_color", v)}
        handwritten={!!content.subtitle_handwritten}
        onHandwrittenChange={(v) => onChange("subtitle_handwritten", v)}
        bgColor={bgColor}
      />
      <BoxedArrayField content={content} onChange={onChange} bgColor={bgColor} />
      <div className="grid grid-cols-2 gap-3">
        <ColorField label="Card Title Color" value={content.color_card_title || ""} fallback="" onChange={(v) => onChange("color_card_title", v)} />
        <ColorField label="Card Body Color" value={content.color_card_body || ""} fallback="" onChange={(v) => onChange("color_card_body", v)} />
      </div>
      <NoteField value={content.note || ""} onChange={(v) => onChange("note", v)} />
      <ColorField label="Note colour" value={content.color_note || ""} fallback="" onChange={(v) => onChange("color_note", v)} />
      <CoverImageField content={content} onChange={onChange} shape />
    </div>
  );
};

export default BoxedRowEditor;
