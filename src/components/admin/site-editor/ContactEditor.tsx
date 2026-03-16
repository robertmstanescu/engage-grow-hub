import { Plus, Trash2 } from "lucide-react";
import { RichField } from "./FieldComponents";

interface Props {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

const ContactEditor = ({ content, onChange }: Props) => {
  const titleLines: string[] = content.title_lines || [content.title_line1 || "", content.title_line2 || ""];

  const updateTitleLine = (idx: number, value: string) => {
    const next = [...titleLines];
    next[idx] = value;
    onChange("title_lines", next);
  };

  const addTitleLine = () => onChange("title_lines", [...titleLines, ""]);
  const removeTitleLine = (idx: number) => onChange("title_lines", titleLines.filter((_, i) => i !== idx));

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">Title Lines</label>
          <button
            type="button"
            onClick={addTitleLine}
            className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full hover:opacity-70 transition-opacity"
            style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
            <Plus size={10} /> Add Line
          </button>
        </div>
        <div className="space-y-1.5">
          {titleLines.map((line, i) => (
            <div key={i} className="flex gap-1.5">
              <input
                value={line}
                onChange={(e) => updateTitleLine(i, e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg font-body text-sm border"
                style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
              />
              <button
                type="button"
                onClick={() => removeTitleLine(i)}
                className="p-1.5 rounded hover:opacity-70 transition-opacity"
                style={{ color: "hsl(var(--destructive))" }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <RichField label="Body" value={content.body || ""} onChange={(v) => onChange("body", v)} />
    </div>
  );
};

export default ContactEditor;
