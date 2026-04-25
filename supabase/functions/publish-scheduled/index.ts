/**
 * publish-scheduled — cron-driven scheduled publisher.
 *
 * Runs every 5 minutes (via pg_cron). Calls the SQL function
 * `public.run_scheduled_publishing()` which atomically:
 *   • promotes drafts whose publish_at <= now() to live content
 *   • blanks/unpublishes entries whose expiry_at <= now()
 *
 * Covered tables: site_content, cms_pages, blog_posts.
 * (email_campaigns has its own send pipeline; we just expose the field.)
 *
 * AUTH: requires either a valid admin JWT (manual trigger from the admin
 * UI for an instant run) or the service-role key (cron). All other
 * callers are rejected.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Single source of truth for the cron shared secret: the `internal_settings`
// table. The edge function looks it up via service_role on each call (cheap,
// indexed PK). pg_cron also reads it from the same table when sending
// X-Cron-Secret. No env var to keep in sync.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ── Authn / Authz ────────────────────────────────────────
  // Accepted callers:
  //   (a) pg_cron — sends shared secret in X-Cron-Secret
  //   (b) admin user manually triggering from the UI (Bearer JWT)
  //   (c) service_role key (server-to-server)
  const auth = req.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const cronSecret = req.headers.get("X-Cron-Secret") || "";

  let isAuthorized = false;

  if (cronSecret) {
    const admin0 = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: row } = await admin0
      .from("internal_settings")
      .select("value")
      .eq("key", "publish_scheduled_cron_secret")
      .maybeSingle();
    if (row?.value && row.value === cronSecret) isAuthorized = true;
  }

  if (!isAuthorized && token && token === SERVICE_ROLE) {
    isAuthorized = true;
  }

  if (!isAuthorized && token) {
    try {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: claims } = await userClient.auth.getClaims(token);
      if (claims?.claims?.sub) {
        const { data: isAdmin } = await userClient.rpc("is_admin", {
          _user_id: claims.claims.sub,
        });
        if (isAdmin === true) isAuthorized = true;
      }
    } catch {
      /* fall through to 401 */
    }
  }

  if (!isAuthorized) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ── Run promoter ─────────────────────────────────────────
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data, error } = await admin.rpc("run_scheduled_publishing");

  if (error) {
    console.error("run_scheduled_publishing failed", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  console.log("scheduled-publish summary", data);
  return new Response(
    JSON.stringify({ ok: true, summary: data }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
