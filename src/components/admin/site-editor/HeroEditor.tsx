import { Plus, Trash2 } from "lucide-react";
import { Field, RichField, SelectField, SectionBox } from "./FieldComponents";

interface TitleLine {
  text: string;
  type: "normal" | "accent";
}

interface Props {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

const HeroEditor = ({ content, onChange }: Props) => {
  // Migrate old format to title_lines if needed
  const titleLines: TitleLine[] = content.title_lines || [
    { text: content.title_line1 || "", type: "normal" },
    { text: content.title_accent || "", type: "accent" },
    { text: content.title_line2 || "", type: "normal" },
  ];

  const updateLine = (idx: number, field: string, value: string) => {
    const next = [...titleLines];
    next[idx] = { ...next[idx], [field]: value };
    onChange("title_lines", next);
  };

  const addLine = () => {
    onChange("title_lines", [...titleLines, { text: "", type: "normal" }]);
  };

  const removeLine = (idx: number) => {
    onChange("title_lines", titleLines.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      <Field label="Label" value={content.label || ""} onChange={(v) => onChange("label", v)} />

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">Title Lines</label>
          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full hover:opacity-70 transition-opacity"
            style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
            <Plus size={10} /> Add Line
          </button>
        </div>
        <div className="space-y-2">
          {titleLines.map((line, i) => (
            <SectionBox key={i} label={`Line ${i + 1}`}>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Field label="Text" value={line.text} onChange={(v) => updateLine(i, "text", v)} />
                </div>
                <div className="w-28">
                  <SelectField
                    label="Style"
                    value={line.type}
                    onChange={(v) => updateLine(i, "type", v)}
                    options={[
                      { label: "Normal", value: "normal" },
                      { label: "Accent", value: "accent" },
                    ]}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  className="self-end p-2 rounded hover:opacity-70 transition-opacity"
                  style={{ color: "hsl(var(--destructive))" }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </SectionBox>
          ))}
        </div>
      </div>

      <RichField label="Body" value={content.body || ""} onChange={(v) => onChange("body", v)} />
    </div>
  );
};

export default HeroEditor;
