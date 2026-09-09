/**
 * Edge Function: bing-webmaster
 * ──────────────────────────────────────────────────────────────────────────
 * Bing Webmaster Tools for the admin, through the site's API key
 * (Webmaster Tools → Settings → API access). Same shape as search-console:
 * status / connect { apiKey } / disconnect / query { days }.
 * The key lives in the service-role-only table; the browser sees only
 * the site URL and the connection date.
 */
import { corsHeaders, json, requireAdmin, readIntegration, writeIntegration, removeIntegration, siteHost, isoDaysAgo } from "../_shared/adminGuard.ts";

const ID = "bing_webmaster";
const API = "https://ssl.bing.com/webmaster/api.svc/json";

interface BingSecret { apiKey: string }

async function bingGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API}/${path}?${qs}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Bing refused ${path} (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  if (data?.ErrorCode || data?.Message) throw new Error(`Bing: ${data.Message || data.ErrorCode}`);
  return (data?.d ?? data) as T;
}

/** Bing dates come as "/Date(1725840000000)/". */
const bingDate = (v: unknown): string => {
  const m = String(v ?? "").match(/\d{10,}/);
  return m ? new Date(Number(m[0])).toISOString().slice(0, 10) : "";
};

function pickSite(sites: Array<{ Url?: string }>, host: string): string | null {
  const s = sites.find((x) => { try { return new URL(x.Url || "").host.replace(/^www\./, "") === host; } catch { return false; } });
  return s?.Url ?? null;
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
      const row = await readIntegration<BingSecret>(admin, ID);
      if (!row?.secret) return json({ connected: false, host });
      return json({ connected: true, host, siteUrl: row.config?.siteUrl ?? null, since: row.config?.connectedAt ?? row.updated_at });
    }
    if (action === "disconnect") {
      await removeIntegration(admin, ID);
      return json({ connected: false, host });
    }
    if (action === "connect") {
      const apiKey = String(body?.apiKey || "").trim();
      if (!apiKey) return json({ error: "Paste the API key from Bing Webmaster Tools → Settings → API access." }, 400);
      const sites = await bingGet<Array<{ Url?: string }>>("GetUserSites", { apikey: apiKey });
      const siteUrl = pickSite(sites, host);
      if (!siteUrl) return json({ error: `The key works, but ${host} is not among its sites. Add and verify the site in Bing Webmaster Tools first (it can import from Google Search Console).`, sites: sites.map((s) => s.Url) }, 409);
      await writeIntegration(admin, ID, { apiKey }, { siteUrl, connectedAt: new Date().toISOString() });
      return json({ connected: true, host, siteUrl, since: new Date().toISOString() });
    }
    if (action === "query") {
      const row = await readIntegration<BingSecret>(admin, ID);
      if (!row?.secret || !row.config?.siteUrl) return json({ error: "Bing Webmaster Tools is not connected." }, 400);
      const days = Math.max(7, Math.min(90, Number(body?.days) || 28));
      const since = isoDaysAgo(days);
      const siteUrl = String(row.config.siteUrl);
      const p = { siteUrl, apikey: row.secret.apiKey };
      const [traffic, queries, pages] = await Promise.all([
        bingGet<Array<{ Date?: string; Clicks?: number; Impressions?: number }>>("GetRankAndTrafficStats", p).catch(() => []),
        bingGet<Array<{ Query?: string; Clicks?: number; Impressions?: number; AvgClickPosition?: number; AvgImpressionPosition?: number; Date?: string }>>("GetQueryStats", p).catch(() => []),
        bingGet<Array<{ Query?: string; Clicks?: number; Impressions?: number; AvgClickPosition?: number; AvgImpressionPosition?: number; Date?: string }>>("GetPageStats", p).catch(() => []),
      ]);
      const byDate = traffic.map((r) => ({ date: bingDate(r.Date), clicks: r.Clicks ?? 0, impressions: r.Impressions ?? 0 })).filter((r) => r.date >= since).sort((a, b) => a.date.localeCompare(b.date));
      const totals = byDate.reduce((a, r) => ({ clicks: a.clicks + r.clicks, impressions: a.impressions + r.impressions }), { clicks: 0, impressions: 0 });
      const agg = (rows: typeof queries, key: "Query") => {
        const m = new Map<string, { clicks: number; impressions: number; posW: number }>();
        for (const r of rows) {
          if (r.Date && bingDate(r.Date) < since) continue;
          const k = String(r[key] ?? ""); if (!k) continue;
          const cur = m.get(k) ?? { clicks: 0, impressions: 0, posW: 0 };
          cur.clicks += r.Clicks ?? 0; cur.impressions += r.Impressions ?? 0; cur.posW += (r.AvgImpressionPosition ?? r.AvgClickPosition ?? 0) * (r.Impressions ?? 0);
          m.set(k, cur);
        }
        return Array.from(m, ([k, v]) => ({ key: k, clicks: v.clicks, impressions: v.impressions, ctr: v.impressions ? v.clicks / v.impressions : 0, position: v.impressions ? v.posW / v.impressions : 0 })).sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, 25);
      };
      return json({
        siteUrl, startDate: since, endDate: isoDaysAgo(0),
        totals: { ...totals, ctr: totals.impressions ? totals.clicks / totals.impressions : 0 },
        byDate,
        byQuery: agg(queries, "Query").map((r) => ({ query: r.key, clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
        byPage: agg(pages, "Query").map((r) => ({ page: r.key, clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
      });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
