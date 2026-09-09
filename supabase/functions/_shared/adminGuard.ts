import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * requireAdmin — the caller must be a signed-in admin.
 *
 * Verifies the session JWT with the anon client, checks admin_users,
 * and hands back a SERVICE-ROLE client for the work that follows
 * (integration secrets live in a table only the service role can read).
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export async function requireAdmin(req: Request): Promise<{ ok: true; admin: ReturnType<typeof createClient>; userId: string } | { ok: false; response: Response }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { ok: false, response: json({ error: "Missing auth" }, 401) };
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return { ok: false, response: json({ error: "Invalid session" }, 401) };
  const { data: adminRow } = await userClient.from("admin_users").select("id").eq("user_id", user.id).maybeSingle();
  if (!adminRow) return { ok: false, response: json({ error: "Not an admin" }, 403) };
  return { ok: true, admin: createClient(supabaseUrl, serviceKey), userId: user.id };
}

/** Read one integration's stored secret and config. */
export async function readIntegration<TSecret = Record<string, unknown>>(admin: ReturnType<typeof createClient>, id: string) {
  const { data } = await admin.from("integration_settings").select("secret, config, updated_at").eq("id", id).maybeSingle();
  return (data ?? null) as { secret: TSecret | null; config: Record<string, unknown>; updated_at: string } | null;
}

export async function writeIntegration(admin: ReturnType<typeof createClient>, id: string, secret: unknown, config: Record<string, unknown>) {
  const { error } = await admin.from("integration_settings").upsert({ id, secret, config, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function removeIntegration(admin: ReturnType<typeof createClient>, id: string) {
  await admin.from("integration_settings").delete().eq("id", id);
}

/** The site's host from SITE_URL, e.g. "themagiccoffin.com". */
export const siteHost = (): string => {
  try { return new URL(Deno.env.get("SITE_URL") || "https://themagiccoffin.com").host.replace(/^www\./, ""); } catch { return "themagiccoffin.com"; }
};

export const isoDaysAgo = (days: number): string => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
