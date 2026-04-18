/**
 * Email Campaigns service — CRUD plus the `send-campaign` edge function.
 */

import { supabase } from "@/integrations/supabase/client";

export interface CampaignRecord {
  id: string;
  subject: string;
  html_content: string;
  status: string;
  sent_at: string | null;
  recipient_count: number;
  created_at: string;
}

export const fetchAllCampaigns = () =>
  supabase.from("email_campaigns").select("*").order("created_at", { ascending: false });

export const insertCampaign = (payload: { subject: string; html_content: string; status: string }) =>
  supabase.from("email_campaigns").insert(payload);

export const updateCampaign = (id: string, payload: Partial<CampaignRecord>) =>
  supabase.from("email_campaigns").update(payload as any).eq("id", id);

export const deleteCampaign = (id: string) =>
  supabase.from("email_campaigns").delete().eq("id", id);

/** Trigger the edge function that actually mails the campaign out. */
export const sendCampaign = (campaignId: string) =>
  supabase.functions.invoke("send-campaign", { body: { campaignId } });
