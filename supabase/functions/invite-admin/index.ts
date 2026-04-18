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

    // Upsert invite row.
    const { error: insertErr } = await adminClient
      .from("admin_invites")
      .upsert({ email: cleanEmail, invited_by: user.id, accepted_at: null }, { onConflict: "email" });
    if (insertErr) throw insertErr;

    // Send magic link via Supabase Admin API.
    const { error: linkErr } = await adminClient.auth.admin.inviteUserByEmail(cleanEmail, {
      redirectTo: `${req.headers.get("origin") || ""}/admin`,
    });

    if (linkErr) {
      // If user already exists, send a magic-link sign-in instead.
      const { error: otpErr } = await adminClient.auth.signInWithOtp({
        email: cleanEmail,
        options: { emailRedirectTo: `${req.headers.get("origin") || ""}/admin` },
      });
      if (otpErr) throw otpErr;
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
