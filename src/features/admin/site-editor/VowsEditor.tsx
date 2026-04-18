import { Plus, Trash2 } from "lucide-react";
import { RichField, SectionBox, ColorField } from "./FieldComponents";
import TitleLineEditor from "./TitleLineEditor";
import SubtitleEditor from "./SubtitleEditor";

interface Props {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

const VowsEditor = ({ content, onChange }: Props) => {
  const titleLines: string[] = (content.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`
  );
  const cards: { title: string; body: string }[] = content.cards || [];

  const updateTitleLine = (idx: number, html: string) => {
    const next = [...titleLines];
    next[idx] = html;
    onChange("title_lines", next);
  };

  const addTitleLine = () => onChange("title_lines", [...titleLines, "<p></p>"]);
  const removeTitleLine = (idx: number) => onChange("title_lines", titleLines.filter((_, i) => i !== idx));

  const updateCard = (idx: number, field: string, value: string) => {
    const next = [...cards];
    next[idx] = { ...next[idx], [field]: value };
    onChange("cards", next);
  };

  const addCard = () => onChange("cards", [...cards, { title: "", body: "" }]);
  const removeCard = (idx: number) => onChange("cards", cards.filter((_, i) => i !== idx));

  return (
    <div className="space-y-4">
      <ColorField label="Title Color" description="Color of the section title" value={content.color_title || ""} fallback="" onChange={(v) => onChange("color_title", v)} />
      <ColorField label="Card Title Color" description="Color of individual card titles" value={content.color_card_title || ""} fallback="" onChange={(v) => onChange("color_card_title", v)} />
      <ColorField label="Card Body Color" description="Color of card body text" value={content.color_card_body || ""} fallback="" onChange={(v) => onChange("color_card_body", v)} />
      <SubtitleEditor
        subtitle={content.subtitle || ""}
        subtitleColor={content.subtitle_color || ""}
        onSubtitleChange={(v) => onChange("subtitle", v)}
        onColorChange={(v) => onChange("subtitle_color", v)}
      />
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

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">Vow Cards</label>
          <button
            type="button"
            onClick={addCard}
            className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full hover:opacity-70 transition-opacity"
            style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
            <Plus size={10} /> Add Card
          </button>
        </div>
        <div className="space-y-2">
          {cards.map((card, i) => (
            <SectionBox key={i} label={`Card ${i + 1}`}>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Title</label>
                    <input
                      value={card.title}
                      onChange={(e) => updateCard(i, "title", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg font-body text-sm border"
                      style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCard(i)}
                    className="self-start p-2 rounded hover:opacity-70 transition-opacity mt-5"
                    style={{ color: "hsl(var(--destructive))" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                <RichField label="Body" value={card.body} onChange={(v) => updateCard(i, "body", v)} />
              </div>
            </SectionBox>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VowsEditor;


