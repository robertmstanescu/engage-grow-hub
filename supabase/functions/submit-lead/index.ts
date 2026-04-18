/**
 * submit-lead — gated download endpoint.
 *
 * Lifecycle:
 *   1. Validate the 4 required fields (full_name, company_university,
 *      title, email) + the requested asset id.
 *   2. Normalise: trim everything, lowercase email, validate email regex.
 *   3. Rate-limit: 10 submissions / 10 minutes per email.
 *   4. Look up the requested asset; return 404 if missing.
 *   5. Upsert into `leads` keyed by email (lowercased). On update, append
 *      the asset title to `download_history` if not already present.
 *   6. Return the public URL of the file.
 *
 * Why upsert instead of insert? The same person can grab multiple lead
 * magnets over time — we want one row per email with a growing history.
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TEXT = 200;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json(500, { error: "Server configuration error" });

  // ── 1. Parse + 2. Normalise ──────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const companyUniversity = typeof body.company_university === "string" ? body.company_university.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const resourceAssetId = typeof body.resource_asset_id === "string" ? body.resource_asset_id.trim() : "";
  const marketingConsent = body.marketing_consent === true;
  // Optional: when the visitor has consented to analytics, the client
  // sends their visitor_id so we can stitch their prior anonymous page
  // views to the email they just submitted (the "Path to Lead" feature).
  const visitorId = typeof body.visitor_id === "string" ? body.visitor_id.trim().slice(0, 64) : "";

  if (!fullName || fullName.length > MAX_TEXT) return json(400, { error: "Full name is required (max 200 chars)" });
  if (!companyUniversity || companyUniversity.length > MAX_TEXT) {
    return json(400, { error: "Company / university is required (max 200 chars)" });
  }
  if (!title || title.length > MAX_TEXT) return json(400, { error: "Title is required (max 200 chars)" });
  if (!email || !EMAIL_REGEX.test(email) || email.length > 320) {
    return json(400, { error: "A valid email address is required" });
  }
  if (!resourceAssetId) return json(400, { error: "Resource is missing" });

  const supabase = createClient(supabaseUrl, serviceKey);

  // ── 3. Rate limit ────────────────────────────────────────────────────
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("updated_at", tenMinutesAgo);
  if ((count ?? 0) >= 10) {
    return json(429, { error: "Too many requests. Please wait a few minutes and try again." });
  }

  // ── 4. Look up the asset ─────────────────────────────────────────────
  const { data: asset, error: assetError } = await supabase
    .from("media_assets")
    .select("id, storage_path, bucket, title")
    .eq("id", resourceAssetId)
    .maybeSingle();
  if (assetError || !asset) return json(404, { error: "Resource not found" });

  // ── 5. Upsert lead ───────────────────────────────────────────────────
  const { data: existing } = await supabase
    .from("leads")
    .select("id, download_history")
    .eq("email", email)
    .maybeSingle();

  const assetTitle = asset.title || asset.storage_path;
  const newHistory = (() => {
    const prior = existing?.download_history ?? [];
    if (prior.includes(assetTitle)) return prior;
    return [...prior, assetTitle];
  })();

  if (existing) {
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        full_name: fullName,
        company_university: companyUniversity,
        title,
        marketing_consent: marketingConsent,
        download_history: newHistory,
      })
      .eq("id", existing.id);
    if (updateError) {
      console.error("Lead update failed", updateError);
      return json(500, { error: "Failed to record submission" });
    }
  } else {
    const { error: insertError } = await supabase.from("leads").insert({
      full_name: fullName,
      company_university: companyUniversity,
      title,
      email,
      marketing_consent: marketingConsent,
      download_history: newHistory,
    });
    if (insertError) {
      console.error("Lead insert failed", insertError);
      return json(500, { error: "Failed to record submission" });
    }
  }

  // ── 6. Stitch prior anonymous analytics rows to this email (best-effort) ─
  // We call a SECURITY DEFINER RPC so the update bypasses RLS without
  // exposing a raw UPDATE policy on `unified_analytics_logs`. Failure here
  // does not block the download — analytics enrichment is non-critical.
  if (visitorId) {
    try {
      await supabase.rpc("stitch_visitor_to_email", {
        _visitor_id: visitorId,
        _email: email,
      });
    } catch (stitchError) {
      console.error("Visitor stitch failed (non-fatal):", stitchError);
    }
  }

  // ── 7. Return the download URL ───────────────────────────────────────
  const { data: publicUrlData } = supabase.storage.from(asset.bucket).getPublicUrl(asset.storage_path);

  return json(200, {
    success: true,
    download_url: publicUrlData.publicUrl,
    asset_title: assetTitle,
  });
});
