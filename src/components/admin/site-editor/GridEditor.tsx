import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { SectionBox, Field, RichField, SelectField, ArrayField, ColorField } from "./FieldComponents";

const ITEM_TYPES = [
  { label: "Card", value: "card" },
  { label: "Stat", value: "stat" },
  { label: "List", value: "list" },
];

interface GridItem {
  type: "card" | "stat" | "list";
  icon?: string;
  title?: string;
  description?: string;
  number?: string;
  suffix?: string;
  label?: string;
  list_items?: string[];
}

interface Props {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

const GridEditor = ({ content, onChange }: Props) => {
  const [openItem, setOpenItem] = useState<number | null>(null);
  const items: GridItem[] = content.items || [];

  const updateItem = (idx: number, field: string, value: any) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: value };
    onChange("items", next);
  };

  const addItem = (type: "card" | "stat" | "list") => {
    const defaults: GridItem = type === "card"
      ? { type: "card", icon: "✦", title: "", description: "" }
      : type === "stat"
      ? { type: "stat", number: "0", suffix: "", label: "" }
      : { type: "list", title: "", list_items: [] };
    onChange("items", [...items, defaults]);
  };

  const removeItem = (idx: number) => {
    onChange("items", items.filter((_, i) => i !== idx));
    if (openItem === idx) setOpenItem(null);
  };

  return (
    <div className="space-y-3">
      <SectionBox label="Header">
        <Field label="Eyebrow" value={content.eyebrow || ""} onChange={(v) => onChange("eyebrow", v)} />
        <Field label="Title" value={content.title || ""} onChange={(v) => onChange("title", v)} />
        <RichField label="Description" value={content.description || ""} onChange={(v) => onChange("description", v)} />
      </SectionBox>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">Grid Items</label>
          <div className="flex gap-1">
            {ITEM_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => addItem(t.value as any)}
                className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full hover:opacity-70 transition-opacity"
                style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
                <Plus size={10} /> {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {items.map((item, i) => (
            <div
              key={i}
              className="rounded-lg border overflow-hidden"
              style={{ borderColor: "hsl(var(--border) / 0.5)", backgroundColor: "hsl(var(--muted) / 0.1)" }}>
              <button
                type="button"
                onClick={() => setOpenItem(openItem === i ? null : i)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:opacity-80 transition-opacity"
                style={{ color: "hsl(var(--foreground))" }}>
                <span className="font-body text-xs font-medium">
                  {item.type === "card" ? `Card: ${item.title || "Untitled"}` : item.type === "stat" ? `Stat: ${item.number || "0"}${item.suffix || ""}` : `List: ${item.title || "Untitled"}`}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-body text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: "hsl(var(--muted) / 0.4)", color: "hsl(var(--muted-foreground))" }}>{item.type}</span>
                  {openItem === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {openItem === i && (
                <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: "hsl(var(--border) / 0.3)" }}>
                  <SelectField label="Type" value={item.type} options={ITEM_TYPES} onChange={(v) => updateItem(i, "type", v)} />

                  {item.type === "card" && (
                    <>
                      <Field label="Icon (emoji or symbol)" value={item.icon || ""} onChange={(v) => updateItem(i, "icon", v)} />
                      <Field label="Title" value={item.title || ""} onChange={(v) => updateItem(i, "title", v)} />
                      <RichField label="Description" value={item.description || ""} onChange={(v) => updateItem(i, "description", v)} />
                    </>
                  )}

                  {item.type === "stat" && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Number" value={item.number || ""} onChange={(v) => updateItem(i, "number", v)} />
                        <Field label="Suffix (e.g. K+, %)" value={item.suffix || ""} onChange={(v) => updateItem(i, "suffix", v)} />
                      </div>
                      <Field label="Label" value={item.label || ""} onChange={(v) => updateItem(i, "label", v)} />
                    </>
                  )}

                  {item.type === "list" && (
                    <>
                      <Field label="Section Title" value={item.title || ""} onChange={(v) => updateItem(i, "title", v)} />
                      <ArrayField
                        label="List Items"
                        items={item.list_items || []}
                        onChange={(items) => updateItem(i, "list_items", items)}
                        placeholder="List item"
                      />
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full hover:opacity-70 transition-opacity"
                    style={{ color: "hsl(var(--destructive))", border: "1px solid hsl(var(--destructive) / 0.3)" }}>
                    <Trash2 size={11} /> Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <SectionBox label="Colors">
        <div className="grid grid-cols-2 gap-3">
          <ColorField label="Eyebrow" value={content.color_eyebrow || ""} fallback="#7B3A91" onChange={(v) => onChange("color_eyebrow", v)} />
          <ColorField label="Title" value={content.color_title || ""} fallback="#2A0E33" onChange={(v) => onChange("color_title", v)} />
          <ColorField label="Description" value={content.color_description || ""} fallback="#555555" onChange={(v) => onChange("color_description", v)} />
          <ColorField label="Card Border" value={content.color_card_border || ""} fallback="#4D1B5E" onChange={(v) => onChange("color_card_border", v)} />
          <ColorField label="Card Border Hover" value={content.color_card_border_hover || ""} fallback="#E5C54F" onChange={(v) => onChange("color_card_border_hover", v)} />
          <ColorField label="Card Title" value={content.color_card_title || ""} fallback="#FFFFFF" onChange={(v) => onChange("color_card_title", v)} />
          <ColorField label="Card Description" value={content.color_card_description || ""} fallback="#CCCCCC" onChange={(v) => onChange("color_card_description", v)} />
          <ColorField label="Stat Number" value={content.color_stat_number || ""} fallback="#E5C54F" onChange={(v) => onChange("color_stat_number", v)} />
          <ColorField label="Stat Label" value={content.color_stat_label || ""} fallback="#999999" onChange={(v) => onChange("color_stat_label", v)} />
        </div>
      </SectionBox>
    </div>
  );
};

export default GridEditor;
