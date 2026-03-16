import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, ArrowUp, ArrowDown, Type, Briefcase, LayoutGrid, Mail } from "lucide-react";
import { generateRowId, DEFAULT_CONTACT_FIELDS, type PageRow } from "@/types/rows";
import { SectionBox, Field, RichField, ArrayField, SelectField, TextArea } from "./FieldComponents";
import TitleLineEditor from "./TitleLineEditor";
import PillarEditor from "./PillarEditor";
import SubtitleEditor from "./SubtitleEditor";

const ROW_TYPES = [
  { type: "text" as const, label: "Text", icon: Type, defaultContent: { title_lines: [], subtitle: "", subtitle_color: "", body: "" } },
  { type: "service" as const, label: "Service", icon: Briefcase, defaultContent: { pillar_number: "", title: "", description: "", services: [] } },
  { type: "boxed" as const, label: "Boxed (max 6)", icon: LayoutGrid, defaultContent: { title_lines: [], subtitle: "", subtitle_color: "", cards: [] } },
  { type: "contact" as const, label: "Contact", icon: Mail, defaultContent: { title_lines: [], body: "", button_text: "Request a discovery call", success_heading: "Message received.", success_body: "We respond within 24 hours.", success_button: "Send another message", show_social: false, fields: DEFAULT_CONTACT_FIELDS } },
];

interface Props {
  rows: PageRow[];
  onChange: (rows: PageRow[]) => void;
}

const RowsManager = ({ rows, onChange }: Props) => {
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const addRow = (type: "text" | "service" | "boxed" | "contact") => {
    const template = ROW_TYPES.find((t) => t.type === type)!;
    const newRow: PageRow = {
      id: generateRowId(),
      type,
      strip_title: `New ${template.label} Row`,
      bg_color: type === "boxed" ? "#2A0E33" : "#FFFFFF",
      content: { ...template.defaultContent },
    };
    onChange([...rows, newRow]);
    setOpenRow(newRow.id);
    setShowAddMenu(false);
  };

  const updateRow = (id: string, updates: Partial<PageRow>) => {
    onChange(rows.map((r) => r.id === id ? { ...r, ...updates } : r));
  };

  const updateRowContent = (id: string, field: string, value: any) => {
    onChange(rows.map((r) => r.id === id ? { ...r, content: { ...r.content, [field]: value } } : r));
  };

  const removeRow = (id: string) => {
    onChange(rows.filter((r) => r.id !== id));
    if (openRow === id) setOpenRow(null);
  };

  const moveRow = (id: string, dir: -1 | 1) => {
    const idx = rows.findIndex((r) => r.id === id);
    if ((dir === -1 && idx === 0) || (dir === 1 && idx === rows.length - 1)) return;
    const next = [...rows];
    [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
    onChange(next);
  };

  const renderRowEditor = (row: PageRow) => {
    const onContentChange = (field: string, value: any) => updateRowContent(row.id, field, value);

    switch (row.type) {
      case "text":
        return <TextRowFields content={row.content} onChange={onContentChange} />;
      case "service":
        return (
          <PillarEditor
            pillarContent={row.content}
            servicesContent={{ services: row.content.services || [] }}
            onPillarChange={onContentChange}
            onServicesChange={(svcs) => onContentChange("services", svcs)}
          />
        );
      case "boxed":
        return <BoxedRowFields content={row.content} onChange={onContentChange} />;
      case "contact":
        return <ContactRowFields content={row.content} onChange={onContentChange} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">Page Rows</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-3 py-1 rounded-full hover:opacity-70 transition-opacity"
            style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
            <Plus size={10} /> Add Row
          </button>
          {showAddMenu && (
            <div
              className="absolute right-0 top-full mt-1 z-50 rounded-lg border shadow-lg overflow-hidden"
              style={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
              {ROW_TYPES.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => addRow(t.type)}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-left hover:opacity-80 transition-opacity font-body text-xs"
                  style={{ color: "hsl(var(--foreground))" }}>
                  <t.icon size={14} />
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {rows.map((row, idx) => {
        const TypeIcon = ROW_TYPES.find((t) => t.type === row.type)?.icon || Type;
        return (
          <div
            key={row.id}
            className="rounded-lg border overflow-hidden"
            style={{ borderColor: "hsl(var(--border) / 0.5)", backgroundColor: "hsl(var(--card))" }}>
            <div className="flex items-center justify-between px-3 py-2.5" style={{ color: "hsl(var(--foreground))" }}>
              <button
                type="button"
                onClick={() => setOpenRow(openRow === row.id ? null : row.id)}
                className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity">
                <TypeIcon size={14} style={{ color: "hsl(var(--muted-foreground))" }} />
                <span className="font-body text-xs font-medium">{row.strip_title}</span>
                <span className="font-body text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "hsl(var(--muted) / 0.4)", color: "hsl(var(--muted-foreground))" }}>
                  {row.type}
                </span>
              </button>
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => moveRow(row.id, -1)} disabled={idx === 0} className="p-1 rounded hover:opacity-70 disabled:opacity-20" style={{ color: "hsl(var(--muted-foreground))" }}>
                  <ArrowUp size={13} />
                </button>
                <button type="button" onClick={() => moveRow(row.id, 1)} disabled={idx === rows.length - 1} className="p-1 rounded hover:opacity-70 disabled:opacity-20" style={{ color: "hsl(var(--muted-foreground))" }}>
                  <ArrowDown size={13} />
                </button>
                <button type="button" onClick={() => removeRow(row.id)} className="p-1 rounded hover:opacity-70" style={{ color: "hsl(var(--destructive))" }}>
                  <Trash2 size={13} />
                </button>
                {openRow === row.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </div>

            {openRow === row.id && (
              <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: "hsl(var(--border) / 0.3)" }}>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Field label="Strip Title" value={row.strip_title} onChange={(v) => updateRow(row.id, { strip_title: v })} />
                  <div>
                    <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Background Color</label>
                    <div className="flex gap-1.5">
                      <input
                        type="color"
                        value={row.bg_color || "#FFFFFF"}
                        onChange={(e) => updateRow(row.id, { bg_color: e.target.value })}
                        className="w-10 h-9 rounded border cursor-pointer"
                        style={{ borderColor: "hsl(var(--border))" }}
                      />
                      <input
                        value={row.bg_color || ""}
                        onChange={(e) => updateRow(row.id, { bg_color: e.target.value })}
                        placeholder="#FFFFFF"
                        className="flex-1 px-3 py-2 rounded-lg font-body text-sm border"
                        style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
                      />
                    </div>
                  </div>
                </div>
                {renderRowEditor(row)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ── Inline sub-editors ── */

const TitleLinesEditor = ({ titleLines, onChange }: { titleLines: string[]; onChange: (lines: string[]) => void }) => {
  const updateLine = (idx: number, html: string) => {
    const next = [...titleLines];
    next[idx] = html;
    onChange(next);
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">Title Lines</label>
        <button type="button" onClick={() => onChange([...titleLines, "<p></p>"])} className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full hover:opacity-70" style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
          <Plus size={10} /> Add
        </button>
      </div>
      <div className="space-y-2">
        {titleLines.map((line, i) => (
          <SectionBox key={i} label={`Line ${i + 1}`}>
            <div className="flex gap-2">
              <div className="flex-1"><TitleLineEditor value={line} onChange={(v) => updateLine(i, v)} /></div>
              <button type="button" onClick={() => onChange(titleLines.filter((_, j) => j !== i))} className="self-end p-2 rounded hover:opacity-70" style={{ color: "hsl(var(--destructive))" }}>
                <Trash2 size={13} />
              </button>
            </div>
          </SectionBox>
        ))}
      </div>
    </div>
  );
};

const TextRowFields = ({ content, onChange }: { content: Record<string, any>; onChange: (field: string, value: any) => void }) => {
  const titleLines: string[] = (content.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`
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
      <RichField label="Body" value={content.body || ""} onChange={(v) => onChange("body", v)} />
    </div>
  );
};

const BoxedRowFields = ({ content, onChange }: { content: Record<string, any>; onChange: (field: string, value: any) => void }) => {
  const titleLines: string[] = (content.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`
  );
  const cards: { title: string; body: string }[] = content.cards || [];

  const updateCard = (idx: number, field: string, value: string) => {
    const next = [...cards];
    next[idx] = { ...next[idx], [field]: value };
    onChange("cards", next);
  };

  return (
    <div className="space-y-3">
      <TitleLinesEditor titleLines={titleLines} onChange={(v) => onChange("title_lines", v)} />
      <SubtitleEditor
        subtitle={content.subtitle || ""}
        subtitleColor={content.subtitle_color || ""}
        onSubtitleChange={(v) => onChange("subtitle", v)}
        onColorChange={(v) => onChange("subtitle_color", v)}
      />
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">Cards (max 6)</label>
          <button type="button" onClick={() => onChange("cards", [...cards, { title: "", body: "" }])} disabled={cards.length >= 6} className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full hover:opacity-70 disabled:opacity-30" style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
            <Plus size={10} /> Add Card
          </button>
        </div>
        <div className="space-y-2">
          {cards.map((card, i) => (
            <SectionBox key={i} label={`Card ${i + 1}`}>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Field label="Title" value={card.title} onChange={(v) => updateCard(i, "title", v)} />
                  </div>
                  <button type="button" onClick={() => onChange("cards", cards.filter((_, j) => j !== i))} className="self-start p-2 rounded hover:opacity-70 mt-5" style={{ color: "hsl(var(--destructive))" }}>
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

const ContactRowFields = ({ content, onChange }: { content: Record<string, any>; onChange: (field: string, value: any) => void }) => {
  const titleLines: string[] = (content.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`
  );
  const fields = content.fields || DEFAULT_CONTACT_FIELDS;

  const updateFieldConfig = (idx: number, key: string, value: any) => {
    const next = [...fields];
    next[idx] = { ...next[idx], [key]: value };
    onChange("fields", next);
  };

  return (
    <div className="space-y-3">
      <TitleLinesEditor titleLines={titleLines} onChange={(v) => onChange("title_lines", v)} />
      <RichField label="Body" value={content.body || ""} onChange={(v) => onChange("body", v)} />
      <Field label="Button Text" value={content.button_text || ""} onChange={(v) => onChange("button_text", v)} />

      <SectionBox label="Form Fields">
        <div className="space-y-2">
          {fields.map((f: any, i: number) => (
            <div key={f.key} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: "hsl(var(--background))" }}>
              <input
                type="checkbox"
                checked={f.visible}
                onChange={(e) => updateFieldConfig(i, "visible", e.target.checked)}
                className="rounded"
                style={{ accentColor: "hsl(var(--primary))" }}
              />
              <input
                value={f.label}
                onChange={(e) => updateFieldConfig(i, "label", e.target.value)}
                className="flex-1 px-2 py-1 rounded font-body text-xs border"
                style={{ borderColor: "hsl(var(--border))", backgroundColor: "transparent" }}
              />
              <label className="flex items-center gap-1 font-body text-[9px] uppercase tracking-wider text-muted-foreground">
                <input
                  type="checkbox"
                  checked={f.required}
                  onChange={(e) => updateFieldConfig(i, "required", e.target.checked)}
                  className="rounded"
                  style={{ accentColor: "hsl(var(--primary))" }}
                />
                Req
              </label>
            </div>
          ))}
        </div>
      </SectionBox>

      <SectionBox label="Success State">
        <Field label="Heading" value={content.success_heading || ""} onChange={(v) => onChange("success_heading", v)} />
        <Field label="Body" value={content.success_body || ""} onChange={(v) => onChange("success_body", v)} />
        <Field label="Button Text" value={content.success_button || ""} onChange={(v) => onChange("success_button", v)} />
      </SectionBox>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={content.show_social || false}
          onChange={(e) => onChange("show_social", e.target.checked)}
          className="rounded"
          style={{ accentColor: "hsl(var(--primary))" }}
        />
        <span className="font-body text-xs text-muted-foreground">Show social media links below form</span>
      </label>
    </div>
  );
};

export default RowsManager;
