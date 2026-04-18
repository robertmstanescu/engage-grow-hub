import { Plus, Trash2 } from "lucide-react";
import { RichField, SectionBox } from "./FieldComponents";
import TitleLineEditor from "./TitleLineEditor";

interface Props {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
  /** Live row background, forwarded to RichField so light text stays legible. */
  bgColor?: string;
}

const ContactEditor = ({ content, onChange, bgColor }: Props) => {
  const titleLines: string[] = (content.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`
  );

  const updateTitleLine = (idx: number, html: string) => {
    const next = [...titleLines];
    next[idx] = html;
    onChange("title_lines", next);
  };

  const addTitleLine = () => onChange("title_lines", [...titleLines, "<p></p>"]);
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
        <div className="space-y-2">
          {titleLines.map((line, i) => (
            <SectionBox key={i} label={`Line ${i + 1}`}>
              <div className="flex gap-2">
                <div className="flex-1">
                  <TitleLineEditor value={line} onChange={(v) => updateTitleLine(i, v)} />
                </div>
                <button
                  type="button"
                  onClick={() => removeTitleLine(i)}
                  className="self-end p-2 rounded hover:opacity-70 transition-opacity"
                  style={{ color: "hsl(var(--destructive))" }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </SectionBox>
          ))}
        </div>
      </div>

      <RichField label="Body" value={content.body || ""} onChange={(v) => onChange("body", v)} bgColor={bgColor} />
    </div>
  );
};

export default ContactEditor;


