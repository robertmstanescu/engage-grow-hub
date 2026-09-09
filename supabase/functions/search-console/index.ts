/**
 * Edge Function: search-console
 * ──────────────────────────────────────────────────────────────────────────
 * Google Search Console for the admin, through a service account:
 *
 *   status      → connected?, property, service-account email, since when
 *   connect     → { serviceAccountJson } : stores the key (service role
 *                 only), signs in, finds the property that matches the
 *                 site, stores it
 *   disconnect  → forgets the key
 *   query       → { days } : clicks / impressions / CTR / position, by
 *                 day, by query, by page, by country
 *
 * Why a service account: no OAuth screens, no expiring user tokens. The
 * owner creates a key in Google Cloud, adds its email as a user of the
 * Search Console property, pastes the JSON once. The key never leaves
 * the database's service-role-only table; the browser only ever sees
 * the email and the property name.
 */
import { corsHeaders, json, requireAdmin, readIntegration, writeIntegration, removeIntegration, siteHost, isoDaysAgo } from "../_shared/adminGuard.ts";

const ID = "google_search_console";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

interface ServiceAccount { client_email: string; private_key: string; project_id?: string }

const b64url = (input: string | Uint8Array): string => {
  const s = typeof input === "string" ? btoa(unescape(encodeURIComponent(input))) : btoa(String.fromCharCode(...input));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function accessToken(sa: ServiceAccount): Promise<string> {
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claim}`)));
  const jwt = `${header}.${claim}.${b64url(sig)}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${jwt}`,
  });
  if (!res.ok) throw new Error(`Google sign-in failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  if (!data.access_token) throw new Error("Google returned no access token.");
  return data.access_token as string;
}

async function listSites(token: string): Promise<Array<{ siteUrl: string; permissionLevel: string }>> {
  const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Search Console refused the site list (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return (data.siteEntry ?? []) as Array<{ siteUrl: string; permissionLevel: string }>;
}

/** The property that is this site: domain property first, then the URL prefix. */
function pickSite(sites: Array<{ siteUrl: string }>, host: string): string | null {
  const domain = sites.find((s) => s.siteUrl === `sc-domain:${host}`);
  if (domain) return domain.siteUrl;
  const prefix = sites.find((s) => { try { return new URL(s.siteUrl).host.replace(/^www\./, "") === host; } catch { return false; } });
  return prefix?.siteUrl ?? null;
}

async function searchAnalytics(token: string, siteUrl: string, body: Record<string, unknown>) {
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Search Console query failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return (data.rows ?? []) as Array<{ keys?: string[]; clicks: number; impressions: number; ctr: number; position: number }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;
  const { admin } = guard;
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "status");
    const host = siteHost();

    if (action === "status") {
      const row = await readIntegration<ServiceAccount>(admin, ID);
      if (!row?.secret) return json({ connected: false, host });
      return json({ connected: true, host, siteUrl: row.config?.siteUrl ?? null, clientEmail: row.secret.client_email, since: row.config?.connectedAt ?? row.updated_at });
    }

    if (action === "disconnect") {
      await removeIntegration(admin, ID);
      return json({ connected: false, host });
    }

    if (action === "connect") {
      let sa: ServiceAccount;
      try { sa = JSON.parse(String(body?.serviceAccountJson || "")); } catch { return json({ error: "That is not a JSON key file. Paste the whole file Google downloaded." }, 400); }
      if (!sa?.client_email || !sa?.private_key) return json({ error: "The key file has no client_email / private_key." }, 400);
      const token = await accessToken(sa);
      const sites = await listSites(token);
      const siteUrl = pickSite(sites, host);
      if (!siteUrl) {
        return json({ error: `Signed in as ${sa.client_email}, but that account is not a user of any property for ${host}. In Search Console → Settings → Users and permissions, add it with Full access, then try again.`, sites: sites.map((s) => s.siteUrl) }, 409);
      }
      await writeIntegration(admin, ID, { client_email: sa.client_email, private_key: sa.private_key, project_id: sa.project_id ?? null }, { siteUrl, connectedAt: new Date().toISOString() });
      return json({ connected: true, host, siteUrl, clientEmail: sa.client_email, since: new Date().toISOString() });
    }

    if (action === "query") {
      const row = await readIntegration<ServiceAccount>(admin, ID);
      if (!row?.secret || !row.config?.siteUrl) return json({ error: "Search Console is not connected." }, 400);
      const days = Math.max(7, Math.min(90, Number(body?.days) || 28));
      // Search Console data trails by about two days.
      const endDate = isoDaysAgo(2);
      const startDate = isoDaysAgo(2 + days);
      const token = await accessToken(row.secret);
      const siteUrl = String(row.config.siteUrl);
      const base = { startDate, endDate, type: "web" };
      const [byDate, byQuery, byPage, byCountry] = await Promise.all([
        searchAnalytics(token, siteUrl, { ...base, dimensions: ["date"], rowLimit: 100 }),
        searchAnalytics(token, siteUrl, { ...base, dimensions: ["query"], rowLimit: 25 }),
        searchAnalytics(token, siteUrl, { ...base, dimensions: ["page"], rowLimit: 25 }),
        searchAnalytics(token, siteUrl, { ...base, dimensions: ["country"], rowLimit: 10 }),
      ]);
      const totals = byDate.reduce((a, r) => ({ clicks: a.clicks + r.clicks, impressions: a.impressions + r.impressions, posWeighted: a.posWeighted + r.position * r.impressions }), { clicks: 0, impressions: 0, posWeighted: 0 });
      return json({
        siteUrl, startDate, endDate,
        totals: { clicks: totals.clicks, impressions: totals.impressions, ctr: totals.impressions ? totals.clicks / totals.impressions : 0, position: totals.impressions ? totals.posWeighted / totals.impressions : 0 },
        byDate: byDate.map((r) => ({ date: r.keys?.[0], clicks: r.clicks, impressions: r.impressions })).sort((a, b) => String(a.date).localeCompare(String(b.date))),
        byQuery: byQuery.map((r) => ({ query: r.keys?.[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
        byPage: byPage.map((r) => ({ page: r.keys?.[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
        byCountry: byCountry.map((r) => ({ country: r.keys?.[0], clicks: r.clicks, impressions: r.impressions })),
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
