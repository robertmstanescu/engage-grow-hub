/**
 * TextRowEditor — Inspector-friendly editor for legacy "text" widgets.
 *
 * Mirrors the field layout used by RowContentEditor's `case "text"` block
 * but exposes a `{ content, onChange }` signature suitable for the
 * widget-level Inspector panel.
 */

import { Field, RichField } from "./FieldComponents";
import SubtitleEditor from "./SubtitleEditor";
import TitleLinesEditor from "../editors/TitleLinesEditor";

interface Props {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
  bgColor?: string;
}

const TextRowEditor = ({ content, onChange, bgColor }: Props) => {
  const titleLines = (content.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`,
  );

  return (
    <div className="space-y-3">
      <Field label="Eyebrow" value={content.eyebrow || ""} onChange={(v) => onChange("eyebrow", v)} />
      <TitleLinesEditor titleLines={titleLines} onChange={(v) => onChange("title_lines", v)} bgColor={bgColor} />
      <SubtitleEditor
        subtitle={content.subtitle || ""}
        subtitleColor={content.subtitle_color || ""}
        onSubtitleChange={(v) => onChange("subtitle", v)}
        onColorChange={(v) => onChange("subtitle_color", v)}
        bgColor={bgColor}
      />
      <RichField label="Body" value={content.body || ""} onChange={(v) => onChange("body", v)} bgColor={bgColor} />
      <Field label="Note (optional)" value={content.note || ""} onChange={(v) => onChange("note", v)} />
    </div>
  );
};

export default TextRowEditor;
