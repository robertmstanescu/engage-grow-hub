/**
 * WorkTeaserAdmin — the teaser row's editor.
 *
 * Eight primary fields (eyebrow, heading, button, mode, pillar, types,
 * count, card style); the picked-card list is one grouped field, and
 * per-card overrides live under "More". Labels name the outcome.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EyebrowField, Field, SelectField, SectionBox, MoreFields } from "@/features/admin/site-editor/FieldComponents";
import type { WorkTeaserContent, WorkTeaserItem } from "./schema";

interface Props {
  content: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
}

const PILLAR_OPTIONS = [
  { label: "Featured items (no pillar)", value: "" },
  { label: "Internal Communications", value: "ic" },
  { label: "Employee Experience", value: "ex" },
  { label: "People Operations", value: "ops" },
  { label: "Fractional HRBP", value: "hrbp" },
  { label: "Pay Transparency", value: "pay" },
  { label: "Manager Enablement", value: "mgr" },
];

const STYLE_OPTIONS = [
  { label: "The item's own style", value: "" },
  { label: "Photo", value: "photo" },
  { label: "Number", value: "number" },
  { label: "Dark", value: "dark" },
  { label: "Quote", value: "quote" },
];

const TYPE_OPTIONS = [
  { label: "Case study", value: "case" },
  { label: "Artefact", value: "artefact" },
  { label: "Playbook", value: "playbook" },
];

interface ItemOption { id: string; title: string; status: string }

const WorkTeaserAdmin = ({ content, onChange }: Props) => {
  const c = content as Partial<WorkTeaserContent>;
  const mode = c.mode === "picked" ? "picked" : "auto";
  const items = Array.isArray(c.items) ? (c.items as WorkTeaserItem[]) : [];
  const types = Array.isArray(c.types) ? (c.types as string[]) : [];
  const [options, setOptions] = useState<ItemOption[]>([]);

  useEffect(() => {
    supabase
      .from("work_items")
      .select("id, title, status")
      .order("sort_order", { ascending: true })
      .then(({ data }) => setOptions((data as ItemOption[]) ?? []));
  }, []);

  const setItems = (next: WorkTeaserItem[]) => onChange("items", next);
  const toggleItem = (id: string) => {
    const existing = items.find((i) => i.work_item_id === id);
    if (existing) setItems(items.filter((i) => i.work_item_id !== id));
    else setItems([...items, { work_item_id: id, style: "", overrides: {} } as WorkTeaserItem]);
  };
  const patchItem = (id: string, patch: Partial<WorkTeaserItem>) =>
    setItems(items.map((i) => (i.work_item_id === id ? { ...i, ...patch } : i)));
  const patchOverride = (id: string, field: string, value: unknown) =>
    setItems(
      items.map((i) =>
        i.work_item_id === id ? { ...i, overrides: { ...(i.overrides || {}), [field]: value } } : i,
      ),
    );
  const toggleType = (t: string) =>
    onChange("types", types.includes(t) ? types.filter((x) => x !== t) : [...types, t]);

  return (
    <div className="space-y-4">
      <EyebrowField
        value={typeof c.eyebrow === "string" ? c.eyebrow : ""}
        onChange={(v) => onChange("eyebrow", v)}
        color={typeof c.color_eyebrow === "string" ? c.color_eyebrow : ""}
        onColorChange={(v) => onChange("color_eyebrow", v)}
      />
      <Field label="Heading" value={typeof c.title === "string" ? c.title : "Selected work"} onChange={(v) => onChange("title", v)} />
      <Field label="Button text" value={typeof c.link_label === "string" ? c.link_label : "All work"} onChange={(v) => onChange("link_label", v)} hint="The button leads to the Work page. Empty hides it." />
      <SelectField
        label="Which cards"
        value={mode}
        onChange={(v) => onChange("mode", v)}
        options={[
          { label: "Newest of a pillar (automatic)", value: "auto" },
          { label: "The cards I pick below", value: "picked" },
        ]}
      />
      {mode === "auto" && (
        <>
          <SelectField label="Pillar" value={typeof c.pillar === "string" ? c.pillar : ""} onChange={(v) => onChange("pillar", v)} options={PILLAR_OPTIONS} />
          <SectionBox label="Only these types">
            <div className="flex flex-wrap gap-3">
              {TYPE_OPTIONS.map((t) => (
                <label key={t.value} className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={types.includes(t.value)} onChange={() => toggleType(t.value)} className="accent-current" />
                  {t.label}
                </label>
              ))}
            </div>
          </SectionBox>
        </>
      )}
      <SelectField
        label="How many cards"
        value={String(typeof c.limit === "number" ? c.limit : 3)}
        onChange={(v) => onChange("limit", Number(v) || 3)}
        options={[
          { label: "3", value: "3" },
          { label: "6", value: "6" },
        ]}
      />
      <SelectField label="Card style" value={typeof c.default_style === "string" ? c.default_style : ""} onChange={(v) => onChange("default_style", v)} options={STYLE_OPTIONS} />
      {mode === "picked" && (
        <SectionBox group label="Cards, in order">
          {options.length === 0 && <p className="text-xs opacity-70">No work items yet — add them under Work in the admin.</p>}
          <div className="space-y-2">
            {options.map((opt) => {
              const picked = items.find((i) => i.work_item_id === opt.id);
              return (
                <div key={opt.id} className="border rounded-md p-2" style={{ borderColor: "hsl(var(--input))" }}>
                  <label className="flex items-center gap-2 text-xs font-medium">
                    <input type="checkbox" checked={Boolean(picked)} onChange={() => toggleItem(opt.id)} className="accent-current" />
                    {opt.title || "(untitled)"}
                    {opt.status !== "published" && <span className="opacity-60">({opt.status})</span>}
                  </label>
                  {picked && (
                    <div className="mt-2 pl-5 space-y-2">
                      <SelectField label="This card's style" value={picked.style || ""} onChange={(v) => patchItem(opt.id, { style: v })} options={STYLE_OPTIONS} />
                      <MoreFields label="Overrides (empty = the item's own words)">
                        <Field label="Title" value={picked.overrides?.title || ""} onChange={(v) => patchOverride(opt.id, "title", v)} />
                        <Field label="Summary" value={picked.overrides?.summary || ""} onChange={(v) => patchOverride(opt.id, "summary", v)} />
                        <Field label="Metric" value={picked.overrides?.metric || ""} onChange={(v) => patchOverride(opt.id, "metric", v)} />
                        <Field label="Metric label" value={picked.overrides?.metric_label || ""} onChange={(v) => patchOverride(opt.id, "metric_label", v)} />
                        <Field label="Pull line" value={picked.overrides?.pull_line || ""} onChange={(v) => patchOverride(opt.id, "pull_line", v)} />
                      </MoreFields>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SectionBox>
      )}
    </div>
  );
};

export default WorkTeaserAdmin;
