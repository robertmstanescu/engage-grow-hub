/**
 * Work Items service — `work_items` table CRUD.
 *
 * Pure data-access layer, mirroring blogPosts.ts. Combine with
 * {@link runDbAction} for toasts and loading state.
 *
 * RLS: visitors read `status = 'published'` only; every write needs
 * an admin session. Scheduled publishing (`publish_at` / `expiry_at`)
 * is handled by `run_scheduled_publishing` in the database.
 */

import { supabase } from "@/integrations/supabase/client";

export interface WorkItemRecord {
  id: string;
  slug: string;
  type: "case" | "artefact" | "playbook";
  pillar: "ic" | "ex" | "ops" | "hrbp" | "pay" | "mgr";
  title: string;
  summary: string;
  metric: string;
  metric_label: string;
  proof_point_id: string | null;
  card_style: "photo" | "number" | "dark" | "quote";
  pull_line: string;
  honesty_label: string;
  role_title: string;
  year: string;
  tags: string[];
  cover_image: string;
  cover_image_alt: string;
  gallery: Array<{ url: string; alt: string; caption?: string }>;
  link_out: string;
  has_case_study: boolean;
  case_rows: unknown[];
  draft_case_rows: unknown[];
  case_proof_ids: string[];
  featured_home: boolean;
  sort_order: number;
  status: string;
  published_at: string | null;
  publish_at: string | null;
  expiry_at: string | null;
  meta_title: string;
  meta_description: string;
  og_image: string;
  ai_summary: string;
  created_at: string;
  updated_at: string;
}

/** Fields a public card or list needs — nothing more crosses the wire. */
export const WORK_CARD_SELECT =
  "id, slug, type, pillar, title, summary, metric, metric_label, proof_point_id, card_style, pull_line, honesty_label, role_title, year, cover_image, cover_image_alt, link_out, has_case_study, sort_order, published_at";

export const fetchAllWorkItems = () =>
  supabase.from("work_items").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });

export const fetchPublishedWorkItems = () =>
  supabase
    .from("work_items")
    .select(WORK_CARD_SELECT)
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false });

export const fetchWorkItemBySlug = (slug: string) =>
  supabase.from("work_items").select("*").eq("slug", slug).eq("status", "published").maybeSingle();

export const insertWorkItem = (payload: Record<string, unknown>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase.from("work_items").insert(payload as any);

export const updateWorkItem = (id: string, payload: Record<string, unknown>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase.from("work_items").update(payload as any).eq("id", id);

export const deleteWorkItem = (id: string) => supabase.from("work_items").delete().eq("id", id);
