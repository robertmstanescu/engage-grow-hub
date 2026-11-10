/**
 * ProofPointsManager — the admin's proof point library.
 *
 * One row per number: value, label, admin-only source note, pillars,
 * order, and the Approved switch. The "Used in" count reads the work
 * items that link to the point, so nobody deletes a number that is on
 * a live card. Unapproved points never reach the public site (RLS).
 */
import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { runDbAction } from "@/services/db-helpers";
import {
  deleteProofPoint,
  fetchAllProofPoints,
  insertProofPoint,
  updateProofPoint,
  type ProofPointRecord,
} from "@/services/proofPoints";
import { supabase } from "@/integrations/supabase/client";
import { Field, TextAreaField } from "./site-editor/FieldComponents";

const PILLAR_NAMES: Record<string, string> = {
  ic: "Internal Comms",
  ex: "Employee Experience",
  ops: "People Ops",
  hrbp: "Fractional HRBP",
  pay: "Pay Transparency",
  mgr: "Manager Enablement",
};

const ProofPointsManager = () => {
  const [points, setPoints] = useState<ProofPointRecord[]>([]);
  const [usedIn, setUsedIn] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data }, { data: uses }] = await Promise.all([
      fetchAllProofPoints(),
      supabase.from("work_items").select("proof_point_id, case_proof_ids"),
    ]);
    const list = (data as ProofPointRecord[]) ?? [];
    setPoints(list);
    const counts: Record<string, number> = {};
    for (const row of (uses as Array<{ proof_point_id: string | null; case_proof_ids: string[] | null }>) ?? []) {
      if (row.proof_point_id) counts[row.proof_point_id] = (counts[row.proof_point_id] ?? 0) + 1;
      for (const id of row.case_proof_ids ?? []) counts[id] = (counts[id] ?? 0) + 1;
    }
    setUsedIn(counts);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const patch = (id: string, payload: Record<string, unknown>, message = "Saved") =>
    runDbAction({ action: () => updateProofPoint(id, payload), successMessage: message, onSuccess: load });

  const addPoint = () =>
    runDbAction({
      action: () => insertProofPoint({ value: "", label: "New proof point", sort_order: (points[points.length - 1]?.sort_order ?? 0) + 1 }),
      successMessage: "Proof point added",
      onSuccess: load,
    });

  const removePoint = (id: string) =>
    runDbAction({ action: () => deleteProofPoint(id), successMessage: "Deleted", onSuccess: load });

  if (loading) return <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Loading proof points…</p>;

  return (
    <div className="space-y-3 max-w-4xl">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          {points.length} proof point{points.length === 1 ? "" : "s"}. Only approved ones appear on the site.
        </p>
        <button type="button" className="admin-btn" onClick={addPoint}>
          <Plus size={14} aria-hidden /> New proof point
        </button>
      </div>

      {points.length === 0 && (
        <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          No proof points yet. Add the numbers you can stand behind, approve them, and link them from work items.
        </p>
      )}

      <ul className="space-y-2">
        {points.map((p) => (
          <li key={p.id} className="rounded-md border px-4 py-3 space-y-3" style={{ borderColor: "hsl(var(--input))", background: "hsl(var(--card))" }}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <Field label="Value (the number)" value={p.value} onChange={(v) => patch(p.id, { value: v })} />
              <div className="md:col-span-2">
                <Field label="Label" value={p.label} onChange={(v) => patch(p.id, { label: v })} />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs font-medium">
                  <input
                    type="checkbox"
                    className="accent-current"
                    checked={p.approved}
                    onChange={(e) => patch(p.id, { approved: e.target.checked }, e.target.checked ? "Approved — now visible on the site" : "Unapproved — hidden from the site")}
                  />
                  Approved
                </label>
                <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Used in {usedIn[p.id] ?? 0}
                </span>
                <button type="button" className="admin-btn ghost icon ml-auto" aria-label="Delete proof point" onClick={() => removePoint(p.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextAreaField label="Source note (admin only)" value={p.source_note} rows={2} onChange={(v) => patch(p.id, { source_note: v })} hint="Where this number comes from. Never shown on the site." />
              <div>
                <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Pillars</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(PILLAR_NAMES).map(([key, name]) => (
                    <label key={key} className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        className="accent-current"
                        checked={(p.pillars ?? []).includes(key)}
                        onChange={() =>
                          patch(p.id, {
                            pillars: (p.pillars ?? []).includes(key) ? (p.pillars ?? []).filter((x) => x !== key) : [...(p.pillars ?? []), key],
                          })
                        }
                      />
                      {name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProofPointsManager;
