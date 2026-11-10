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
import WorkTypeChip from "@/features/site/work/WorkTypeChip";
import { pillarColorFromKey } from "@/lib/constants/pillarColors";

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
    <div className="work-admin">
      <div className="space-y-3 min-w-0">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="admin-sub">
          {items.length} item{items.length === 1 ? "" : "s"}. Published items appear on the Work page in this order.
        </p>
        <button type="button" className="admin-btn primary" onClick={addItem}>
          <Plus size={14} aria-hidden /> New work item
        </button>
      </div>

      {items.length === 0 && (
        <p className="admin-panel admin-empty">
          No work items yet. The Work page shows "New work is on its way." until the first one is published.
        </p>
      )}

      <ul className="space-y-2">
        {items.map((item, index) => {
          const editing = editingId === item.id;
          const pillarColour = pillarColorFromKey(item.pillar);
          const proof = item.proof_point_id ? proofs.find((p) => p.id === item.proof_point_id) : undefined;
          return (
            <li key={item.id} className="admin-panel overflow-hidden">
              <div className="work-admin-row">
                <div className="flex flex-col">
                  <button type="button" className="admin-btn ghost icon" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
                    <ArrowUp size={12} />
                  </button>
                  <button type="button" className="admin-btn ghost icon" aria-label="Move down" disabled={index === items.length - 1} onClick={() => move(index, 1)}>
                    <ArrowDown size={12} />
                  </button>
                </div>
                {item.cover_image ? (
                  <img src={item.cover_image} alt="" loading="lazy" className="work-admin-thumb" />
                ) : (
                  <span aria-hidden className="work-admin-thumb" />
                )}
                <div className="min-w-0">
                  <p className="work-admin-title truncate">
                    {String(index + 1).padStart(2, "0")} · {item.title || "(untitled)"}
                  </p>
                  <p className="admin-sub truncate">/work/{item.slug}</p>
                </div>
                <WorkTypeChip type={item.type} />
                <span className="work-admin-pillar">
                  {pillarColour && <span aria-hidden className="admin-dot" style={{ background: pillarColour }} />}
                  {PILLAR_OPTIONS.find((p) => p.value === item.pillar)?.label ?? item.pillar}
                </span>
                <span className="work-admin-number">
                  {item.metric && <strong>{item.metric}</strong>} {item.metric_label || item.honesty_label}
                  {proof && !proof.approved && <em> (number hidden until its proof point is approved)</em>}
                </span>
                <span className={`admin-st ${item.status === "published" ? "live" : "draft"}`}>
                  {item.status === "published" ? "Published" : "Draft"}
                </span>
                <label className="flex items-center gap-1.5" title="Show among the featured items on the homepage">
                  <input
                    type="checkbox"
                    className="accent-current"
                    checked={item.featured_home}
                    onChange={(e) => patch(item.id, { featured_home: e.target.checked }, e.target.checked ? "Featured on the homepage" : "Removed from the homepage")}
                  />
                  Home
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

      {/* Where a work item turns up on the site (design: AdminWork). */}
      <aside className="admin-panel work-admin-where">
        <h2>Where this shows</h2>
        <p><strong>Work page:</strong> every published item, in this order, with the pillar and type filters.</p>
        <p><strong>Homepage and service pages:</strong> wherever a "Work teaser" block is placed. It shows the items ticked Home, or a pillar's items.</p>
        <p><strong>Case study pages:</strong> items with a case study switched on.</p>
        <p><strong>Drafts stay off the site.</strong> A number linked to a proof point shows only once that proof point is approved.</p>
      </aside>
    </div>
  );
};

export default WorkItemsManager;
