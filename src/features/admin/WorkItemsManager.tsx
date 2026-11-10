/**
 * WorkItemsManager — the admin's Work items list.
 *
 * One row per item: title, pillar, type, status pill, featured toggle,
 * reorder buttons, edit and delete. "New item" starts a draft. Editing
 * opens the inline form under the row — eight fields up front, the
 * rest under "More". The case-study body itself is edited in the page
 * builder (Phase 6); the form only flags whether one exists.
 */
import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { runDbAction } from "@/services/db-helpers";
import {
  deleteWorkItem,
  fetchAllWorkItems,
  insertWorkItem,
  updateWorkItem,
  type WorkItemRecord,
} from "@/services/workItems";
import { fetchAllProofPoints, type ProofPointRecord } from "@/services/proofPoints";
import { Field, SelectField, SectionBox, MoreFields, TextAreaField } from "./site-editor/FieldComponents";
import ImagePickerField from "./ImagePickerField";

const PILLAR_OPTIONS = [
  { label: "Internal Communications", value: "ic" },
  { label: "Employee Experience", value: "ex" },
  { label: "People Operations", value: "ops" },
  { label: "Fractional HRBP", value: "hrbp" },
  { label: "Pay Transparency", value: "pay" },
  { label: "Manager Enablement", value: "mgr" },
];
const TYPE_OPTIONS = [
  { label: "Case study", value: "case" },
  { label: "Artefact", value: "artefact" },
  { label: "Playbook", value: "playbook" },
];
const STYLE_OPTIONS = [
  { label: "Photo", value: "photo" },
  { label: "Number", value: "number" },
  { label: "Dark", value: "dark" },
  { label: "Quote", value: "quote" },
];

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `item-${Date.now()}`;

const WorkItemsManager = () => {
  const [items, setItems] = useState<WorkItemRecord[]>([]);
  const [proofs, setProofs] = useState<ProofPointRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data }, { data: pts }] = await Promise.all([fetchAllWorkItems(), fetchAllProofPoints()]);
    setItems((data as WorkItemRecord[]) ?? []);
    setProofs((pts as ProofPointRecord[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const patch = (id: string, payload: Record<string, unknown>, message = "Saved") =>
    runDbAction({ action: () => updateWorkItem(id, payload), successMessage: message, onSuccess: load });

  const addItem = () =>
    runDbAction({
      action: () =>
        insertWorkItem({
          slug: `item-${Date.now()}`,
          title: "New work item",
          status: "draft",
          sort_order: (items[items.length - 1]?.sort_order ?? 0) + 1,
        }),
      successMessage: "Draft created",
      onSuccess: load,
    });

  const removeItem = (id: string) =>
    runDbAction({ action: () => deleteWorkItem(id), successMessage: "Deleted", onSuccess: load });

  const move = (index: number, dir: -1 | 1) => {
    const a = items[index];
    const b = items[index + dir];
    if (!a || !b) return;
    void runDbAction({
      action: async () => {
        await updateWorkItem(a.id, { sort_order: b.sort_order });
        return updateWorkItem(b.id, { sort_order: a.sort_order });
      },
      successMessage: "Order saved",
      onSuccess: load,
    });
  };

  if (loading) return <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Loading work items…</p>;

  return (
    <div className="space-y-3 max-w-4xl">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          {items.length} item{items.length === 1 ? "" : "s"}. Published items appear on the Work page in this order.
        </p>
        <button type="button" className="admin-btn" onClick={addItem}>
          <Plus size={14} aria-hidden /> New item
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          No work items yet. The Work page shows "New work is on its way." until the first one is published.
        </p>
      )}

      <ul className="space-y-2">
        {items.map((item, index) => {
          const editing = editingId === item.id;
          return (
            <li key={item.id} className="rounded-md border" style={{ borderColor: "hsl(var(--input))", background: "hsl(var(--card))" }}>
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="flex flex-col">
                  <button type="button" className="admin-btn ghost icon" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
                    <ArrowUp size={12} />
                  </button>
                  <button type="button" className="admin-btn ghost icon" aria-label="Move down" disabled={index === items.length - 1} onClick={() => move(index, 1)}>
                    <ArrowDown size={12} />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title || "(untitled)"}</p>
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {PILLAR_OPTIONS.find((p) => p.value === item.pillar)?.label ?? item.pillar} · {item.type} · /work/{item.slug}
                  </p>
                </div>
                <span
                  className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-md"
                  style={{
                    background: item.status === "published" ? "hsl(var(--admin-ok) / 0.15)" : "hsl(var(--muted))",
                    color: item.status === "published" ? "hsl(var(--admin-ok))" : "hsl(var(--muted-foreground))",
                  }}
                >
                  {item.status}
                </span>
                <label className="flex items-center gap-1 text-xs" title="Show among the featured items on the homepage">
                  <input
                    type="checkbox"
                    className="accent-current"
                    checked={item.featured_home}
                    onChange={(e) => patch(item.id, { featured_home: e.target.checked }, e.target.checked ? "Featured on the homepage" : "Removed from the homepage")}
                  />
                  Featured
                </label>
                <button type="button" className="admin-btn ghost icon" aria-label={editing ? "Close editor" : "Edit item"} onClick={() => setEditingId(editing ? null : item.id)}>
                  <Pencil size={13} />
                </button>
                <button type="button" className="admin-btn ghost icon" aria-label="Delete item" onClick={() => removeItem(item.id)}>
                  <Trash2 size={13} />
                </button>
              </div>

              {editing && (
                <div className="border-t px-4 py-4 space-y-4" style={{ borderColor: "hsl(var(--input))" }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Title" value={item.title} maxLength={72} onChange={(v) => patch(item.id, { title: v })} />
                    <Field label="Slug" value={item.slug} onChange={(v) => patch(item.id, { slug: slugify(v) })} hint="The web address: /work/your-slug" />
                    <SelectField label="Pillar" value={item.pillar} onChange={(v) => patch(item.id, { pillar: v })} options={PILLAR_OPTIONS} />
                    <SelectField label="Type" value={item.type} onChange={(v) => patch(item.id, { type: v })} options={TYPE_OPTIONS} />
                    <SelectField label="Card style" value={item.card_style} onChange={(v) => patch(item.id, { card_style: v })} options={STYLE_OPTIONS} />
                    <SelectField
                      label="Status"
                      value={item.status}
                      onChange={(v) => patch(item.id, { status: v, ...(v === "published" && !item.published_at ? { published_at: new Date().toISOString() } : {}) })}
                      options={[
                        { label: "Draft", value: "draft" },
                        { label: "Published", value: "published" },
                      ]}
                    />
                    <Field label="Metric (the number)" value={item.metric} onChange={(v) => patch(item.id, { metric: v })} />
                    <Field label="Metric label" value={item.metric_label} onChange={(v) => patch(item.id, { metric_label: v })} />
                  </div>
                  <TextAreaField label="Summary" value={item.summary} maxLength={140} onChange={(v) => patch(item.id, { summary: v })} hint="One sentence, shown on the card." />
                  <ImagePickerField
                    label="Cover image"
                    value={item.cover_image}
                    onChange={(v) => patch(item.id, { cover_image: v })}
                    altValue={item.cover_image_alt}
                    onAltChange={(v) => patch(item.id, { cover_image_alt: v })}
                  />
                  <MoreFields label="More">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Pull line (quote cards)" value={item.pull_line} onChange={(v) => patch(item.id, { pull_line: v })} />
                      <Field label="Role title" value={item.role_title} onChange={(v) => patch(item.id, { role_title: v })} />
                      <Field label="Year" value={item.year} onChange={(v) => patch(item.id, { year: v })} />
                      <Field label="Honesty label" value={item.honesty_label} onChange={(v) => patch(item.id, { honesty_label: v })} hint="Required for artefacts and playbooks — say what was real and what was rebuilt." />
                      <Field label="Tags (comma separated)" value={(item.tags ?? []).join(", ")} onChange={(v) => patch(item.id, { tags: v.split(",").map((t) => t.trim()).filter(Boolean) })} />
                      <Field label="External link" value={item.link_out} onChange={(v) => patch(item.id, { link_out: v })} hint="When set, the card opens this link instead of a case study." />
                      <SelectField
                        label="Linked proof point"
                        value={item.proof_point_id ?? ""}
                        onChange={(v) => patch(item.id, { proof_point_id: v || null })}
                        options={[{ label: "None", value: "" }, ...proofs.map((p) => ({ label: `${p.value} — ${p.label}${p.approved ? "" : " (not approved)"}`, value: p.id }))]}
                      />
                      <SelectField
                        label="Case study page"
                        value={item.has_case_study ? "yes" : "no"}
                        onChange={(v) => patch(item.id, { has_case_study: v === "yes" })}
                        options={[
                          { label: "No case study", value: "no" },
                          { label: "Has a case study", value: "yes" },
                        ]}
                      />
                      <Field label="Search title" value={item.meta_title} onChange={(v) => patch(item.id, { meta_title: v })} />
                      <Field label="Search description" value={item.meta_description} onChange={(v) => patch(item.id, { meta_description: v })} />
                    </div>
                  </MoreFields>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default WorkItemsManager;
