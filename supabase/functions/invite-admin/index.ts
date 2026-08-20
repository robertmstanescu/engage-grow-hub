/**
 * invite-admin edge function.
 *
 * Called by the Manage Team UI. Validates the caller is an admin,
 * inserts a row into admin_invites, then triggers a Supabase magic
 * link to the invitee. When they click the link and sign in, the
 * `handle_new_user` DB trigger sees the matching invite row and
 * promotes them to admin automatically.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Allowlist for the Origin header used to build the magic-link redirect.
// SITE_URL is the canonical site domain; ALLOWED_ORIGINS can hold extra
// comma-separated origins (e.g. staging/preview deployments).
const SITE_URL = Deno.env.get("SITE_URL") ?? "";
const ALLOWED_ORIGINS = new Set(
  [SITE_URL, ...(Deno.env.get("ALLOWED_ORIGINS")?.split(",") ?? [])]
    .map((o) => o.trim())
    .filter(Boolean),
);

// Never trust the Origin header blindly for building a redirect URL — an
// attacker-controlled Origin could otherwise send the magic link to a
// look-alike domain. Only use it if it's on our allowlist; fall back to
// the canonical site URL otherwise.
function resolveRedirectOrigin(req: Request): string {
  const origin = req.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) return origin;
  return SITE_URL;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin using their JWT.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: adminRow } = await userClient
      .from("admin_users").select("id").eq("user_id", user.id).maybeSingle();
    if (!adminRow) {
      return new Response(JSON.stringify({ error: "Not an admin" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const adminClient = createClient(supabaseUrl, serviceKey);
    const redirectTo = `${resolveRedirectOrigin(req)}/admin`;

    // Upsert invite row.
    const { error: insertErr } = await adminClient
      .from("admin_invites")
      .upsert({ email: cleanEmail, invited_by: user.id, accepted_at: null }, { onConflict: "email" });
    if (insertErr) throw insertErr;

    // Send magic link via Supabase Admin API.
    const { error: linkErr } = await adminClient.auth.admin.inviteUserByEmail(cleanEmail, {
      redirectTo,
    });

    if (linkErr) {
      // If user already exists, send a magic-link sign-in instead.
      const { error: otpErr } = await adminClient.auth.signInWithOtp({
        email: cleanEmail,
        options: { emailRedirectTo: redirectTo },
      });
      if (otpErr) throw otpErr;
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    // Log the real error server-side only; never leak internals to the client.
    console.error("invite-admin error:", e);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
