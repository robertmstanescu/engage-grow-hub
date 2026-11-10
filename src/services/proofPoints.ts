/**
 * Proof Points service — `proof_points` table CRUD.
 *
 * A proof point is one verifiable number ("36 countries", "500 people
 * supported") with an admin-only source note. Visitors read approved
 * points only; every write needs an admin session.
 */

import { supabase } from "@/integrations/supabase/client";

export interface ProofPointRecord {
  id: string;
  value: string;
  label: string;
  source_note: string;
  approved: boolean;
  pillars: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const fetchAllProofPoints = () =>
  supabase.from("proof_points").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });

/** Public: RLS already narrows this to approved rows for non-admins. */
export const fetchApprovedProofPoints = () =>
  supabase.from("proof_points").select("id, value, label, pillars, sort_order").eq("approved", true).order("sort_order", { ascending: true });

export const fetchProofPointsByIds = (ids: string[]) =>
  ids.length === 0
    ? Promise.resolve({ data: [] as ProofPointRecord[], error: null })
    : supabase.from("proof_points").select("id, value, label, approved").in("id", ids);

export const insertProofPoint = (payload: Record<string, unknown>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase.from("proof_points").insert(payload as any);

export const updateProofPoint = (id: string, payload: Record<string, unknown>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase.from("proof_points").update(payload as any).eq("id", id);

export const deleteProofPoint = (id: string) => supabase.from("proof_points").delete().eq("id", id);
