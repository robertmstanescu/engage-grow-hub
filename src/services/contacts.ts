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
}

export const fetchAllContacts = () =>
  supabase.from("contacts").select("*").order("created_at", { ascending: false });

export const deleteContact = (id: string) =>
  supabase.from("contacts").delete().eq("id", id);
