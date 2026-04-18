/**
 * Leads service — admin-side reads only.
 *
 * Lead submissions are inserted server-side via the `submit-lead` edge
 * function (which performs Zod validation, email normalisation, upsert
 * by email, and download-history append). We never insert from the
 * client because the table's RLS only grants the service role write
 * access.
 */

import { supabase } from "@/integrations/supabase/client";

export interface LeadRecord {
  id: string;
  full_name: string;
  company_university: string;
  title: string;
  email: string;
  download_history: string[];
  marketing_consent: boolean;
  created_at: string;
  updated_at: string;
}

export const fetchAllLeads = () =>
  supabase.from("leads").select("*").order("created_at", { ascending: false });

export const deleteLead = (id: string) =>
  supabase.from("leads").delete().eq("id", id);

/**
 * Submit a gated-download form. Returns the public URL of the resource
 * once the lead has been recorded server-side. Callers are responsible
 * for actually opening that URL — see ResourceWidget.
 */
export async function submitLeadAndGetDownload(payload: {
  fullName: string;
  companyUniversity: string;
  title: string;
  email: string;
  resourceAssetId: string;
  marketingConsent: boolean;
}): Promise<{ downloadUrl: string | null; error: string | null }> {
  // Pull the visitor_id out of the consent cookie (only present when the
  // user clicked Accept on the privacy gate). The edge function uses it
  // to stitch this lead's prior anonymous analytics rows to their email.
  const { getVisitorId, getConsentStatus } = await import("@/services/analytics");
  const visitorId = getConsentStatus() === "accepted" ? getVisitorId() : null;

  const { data, error } = await supabase.functions.invoke("submit-lead", {
    body: {
      full_name: payload.fullName,
      company_university: payload.companyUniversity,
      title: payload.title,
      email: payload.email,
      resource_asset_id: payload.resourceAssetId,
      marketing_consent: payload.marketingConsent,
      visitor_id: visitorId,
    },
  });

  if (error) {
    return { downloadUrl: null, error: error.message || "Submission failed" };
  }
  if (data?.error) {
    return { downloadUrl: null, error: data.error };
  }
  return { downloadUrl: data?.download_url ?? null, error: null };
}
