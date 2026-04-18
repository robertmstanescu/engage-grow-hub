import { Plus, Trash2 } from "lucide-react";
import { SectionBox, Field, RichField, ColorField } from "./FieldComponents";
import TitleLineEditor from "./TitleLineEditor";
import SubtitleEditor from "./SubtitleEditor";

interface Props {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

const GridEditor = ({ content, onChange }: Props) => {
  const titleLines: string[] = (content.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`
  );

  /* ── Stats (exactly 3) ── */
  const stats: { value: string; label: string }[] = content.stats || [
    { value: "", label: "" },
    { value: "", label: "" },
    { value: "", label: "" },
  ];
  while (stats.length < 3) stats.push({ value: "", label: "" });

  const updateStat = (idx: number, field: string, value: string) => {
    const next = [...stats];
    next[idx] = { ...next[idx], [field]: value };
    onChange("stats", next);
  };

  /* ── Achievements ── */
  const achievements: string[] = content.achievements || [];

  const updateAchievement = (idx: number, value: string) => {
    const next = [...achievements];
    next[idx] = value;
    onChange("achievements", next);
  };

  const addAchievement = () => onChange("achievements", [...achievements, ""]);
  const removeAchievement = (idx: number) => onChange("achievements", achievements.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {/* Header */}
      <SectionBox label="Header">
        <Field label="Eyebrow" value={content.eyebrow || ""} onChange={(v) => onChange("eyebrow", v)} />
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">Title Lines</label>
            <button type="button" onClick={() => onChange("title_lines", [...titleLines, "<p></p>"])} className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full hover:opacity-70" style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
              <Plus size={10} /> Add
            </button>
          </div>
          {titleLines.map((line, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <div className="flex-1"><TitleLineEditor value={line} onChange={(v) => { const next = [...titleLines]; next[i] = v; onChange("title_lines", next); }} /></div>
              <button type="button" onClick={() => onChange("title_lines", titleLines.filter((_, j) => j !== i))} className="self-end p-2 rounded hover:opacity-70" style={{ color: "hsl(var(--destructive))" }}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
        <SubtitleEditor subtitle={content.subtitle || ""} subtitleColor={content.subtitle_color || ""} onSubtitleChange={(v) => onChange("subtitle", v)} onColorChange={(v) => onChange("subtitle_color", v)} />
        <RichField label="Description" value={content.description || ""} onChange={(v) => onChange("description", v)} />
      </SectionBox>

      {/* Stats (fixed 3) */}
      <SectionBox label="Stats (3 units)">
        {stats.slice(0, 3).map((s, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 mb-2">
            <Field label={`Stat ${i + 1} Value`} value={s.value} onChange={(v) => updateStat(i, "value", v)} />
            <Field label={`Stat ${i + 1} Label`} value={s.label} onChange={(v) => updateStat(i, "label", v)} />
          </div>
        ))}
      </SectionBox>

      {/* Achievements */}
      <SectionBox label="Achievements">
        <div className="space-y-2">
          {achievements.map((text, i) => (
            <div key={i} className="flex items-start gap-2">
              <textarea
                className="flex-1 px-3 py-2 rounded-lg font-body text-sm border resize-none text-black"
                rows={2}
                value={text}
                onChange={(e) => updateAchievement(i, e.target.value)}
                placeholder="Achievement text"
                style={{ borderColor: "hsl(var(--border))", backgroundColor: "#FFFFFF" }}
              />
              <button type="button" onClick={() => removeAchievement(i)} className="mt-2 hover:opacity-70 transition-opacity" style={{ color: "hsl(var(--destructive))" }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button type="button" onClick={addAchievement} className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full hover:opacity-70 transition-opacity" style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
            <Plus size={10} /> Add Achievement
          </button>
        </div>
      </SectionBox>

      {/* Note & Button */}
      <SectionBox label="Note & Button">
        <Field label="Note (optional)" value={content.note || ""} onChange={(v) => onChange("note", v)} />
        <Field label="Button Label" value={content.cta_label || ""} onChange={(v) => onChange("cta_label", v)} />
        <Field label="Button URL" value={content.cta_url || ""} onChange={(v) => onChange("cta_url", v)} />
      </SectionBox>

      {/* Colors */}
      <SectionBox label="Colors">
        <div className="grid grid-cols-2 gap-3">
          <ColorField label="Eyebrow" value={content.color_eyebrow || ""} fallback="#7B3A91" onChange={(v) => onChange("color_eyebrow", v)} />
          <ColorField label="Title" value={content.color_title || ""} fallback="#2A0E33" onChange={(v) => onChange("color_title", v)} />
          <ColorField label="Description" value={content.color_description || ""} fallback="#555555" onChange={(v) => onChange("color_description", v)} />
          <ColorField label="Card Background" value={content.color_card_bg || ""} fallback="#1a0d24" onChange={(v) => onChange("color_card_bg", v)} />
          <ColorField label="Card Border" value={content.color_card_border || ""} fallback="#4D1B5E" onChange={(v) => onChange("color_card_border", v)} />
          <ColorField label="Card Description" value={content.color_card_description || ""} fallback="#CCCCCC" onChange={(v) => onChange("color_card_description", v)} />
          <ColorField label="Stat Number" value={content.color_stat_number || ""} fallback="#E5C54F" onChange={(v) => onChange("color_stat_number", v)} />
          <ColorField label="Stat Suffix" value={content.color_stat_suffix || ""} fallback="#E5C54F" onChange={(v) => onChange("color_stat_suffix", v)} />
          <ColorField label="Stat Label" value={content.color_stat_label || ""} fallback="#999999" onChange={(v) => onChange("color_stat_label", v)} />
          <ColorField label="Note" value={content.color_note || ""} fallback="#999999" onChange={(v) => onChange("color_note", v)} />
        </div>
      </SectionBox>
    </div>
  );
};

export default GridEditor;
