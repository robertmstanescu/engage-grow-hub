/**
 * Contacts service — read/delete the `contacts` table.
 *
 * Inserts go through the `submit-contact` edge function (server-side
 * validation + spam protection), so this file is read + delete only.
 */

import { supabase } from "@/integrations/supabase/client";

export interface ContactRecord {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string | null;
  subscribed_to_marketing: boolean;
  created_at: string;
  /**
   * Epic 4 / US 4.3 — AI-generated intent score (0–100). NULL means the
   * enrichment pipeline hasn't graded this lead yet. The UI buckets:
   *   ≥75 → Hot, 40–74 → Warm, <40 → Cold.
   */
  ai_score: number | null;
  /** Enriched LinkedIn profile URL (populated by the AI agent webhook). */
  linkedin_url: string | null;
}

export const fetchAllContacts = () =>
  supabase.from("contacts").select("*").order("created_at", { ascending: false });

export const deleteContact = (id: string) =>
  supabase.from("contacts").delete().eq("id", id);
