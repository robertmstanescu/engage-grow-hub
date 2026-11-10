/**
 * BoxedRowEditor — the one editor for "boxed" card rows, used by every
 * admin surface through RowTypeEditor.
 *
 * "Our Vows" is a boxed row too: the separate VowsEditor it once had was
 * a drifting copy of this file (same cards[] + card colours) plus a
 * "Title Color" field that BoxedRow honours (`color_title`) — that field
 * now lives here and the copy is gone.
 */

import { ColorField, EyebrowField, Field, MoreFields, NoteField, RichField, SelectField } from "./FieldComponents";
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
      <SelectField
        label="Cards layout"
        value={content.layout_mode || ""}
        onChange={(v) => onChange("layout_mode", v)}
        options={[
          { label: "Grid of cards", value: "" },
          { label: "Numbered list", value: "list" },
        ]}
      />
      {!(content.layout_mode === "list") && (
        <SelectField
          label="Card markers"
          value={content.marker_style || ""}
          onChange={(v) => onChange("marker_style", v)}
          options={[
            { label: "None", value: "" },
            { label: "Roman numerals (vows)", value: "roman" },
            { label: "Service dot, number and Explore link", value: "pillar_number" },
            { label: "Short bar above the title", value: "bar" },
            { label: "Handwritten line (no card)", value: "note" },
          ]}
        />
      )}
      <MoreFields>
        <Field
          label="Small label above the light cards (optional)"
          value={content.group_label || ""}
          onChange={(v) => onChange("group_label", v)}
        />
        <RichField label="Intro under the heading (optional)" value={content.intro || ""} onChange={(v) => onChange("intro", v)} />
      </MoreFields>
      <BoxedArrayField content={content} onChange={onChange} bgColor={bgColor} />
      <div className="grid grid-cols-2 gap-3">
        <ColorField label="Card Title Color" value={content.color_card_title || ""} fallback="" onChange={(v) => onChange("color_card_title", v)} />
        <ColorField label="Card Body Color" value={content.color_card_body || ""} fallback="" onChange={(v) => onChange("color_card_body", v)} />
      </div>
      <NoteField value={content.note || ""} onChange={(v) => onChange("note", v)} handwritten={!!content.note_handwritten} onHandwrittenChange={(v) => onChange("note_handwritten", v)} />
      <ColorField label="Note colour" value={content.color_note || ""} fallback="" onChange={(v) => onChange("color_note", v)} />
      <CoverImageField content={content} onChange={onChange} shape />
    </div>
  );
};

export default BoxedRowEditor;
