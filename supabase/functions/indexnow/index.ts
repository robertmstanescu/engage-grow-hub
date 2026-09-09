/**
 * Edge Function: indexnow
 * ──────────────────────────────────────────────────────────────────────────
 * Tells Bing, Yandex and the other IndexNow engines which pages just
 * changed, so they recrawl within minutes instead of days. Google does not
 * use IndexNow; it has the sitemap and Search Console.
 *
 * The key is proved by serving it at https://<site>/<key>.txt
 * (public/<key>.txt in the repo). Admins call this after a publish with
 * the changed URLs; "Submit all pages" sends the sitemap's URLs.
 */
import { corsHeaders, json, requireAdmin } from "../_shared/adminGuard.ts";

const KEY = Deno.env.get("INDEXNOW_KEY") || "9f4c1e7a2b8d4e6f9a0c3b5d7e1f2a4b";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;
  try {
    const body = await req.json().catch(() => ({}));
    const site = Deno.env.get("SITE_URL") || "https://themagiccoffin.com";
    const host = new URL(site).host;
    let urls: string[] = Array.isArray(body?.urls) ? body.urls.map(String) : [];
    if (body?.all) {
      const xml = await (await fetch(`${site.replace(/\/$/, "")}/sitemap.xml`)).text();
      urls = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);
    }
    urls = Array.from(new Set(urls.filter((u) => { try { return new URL(u).host === host; } catch { return false; } }))).slice(0, 10_000);
    if (urls.length === 0) return json({ error: "No page addresses to submit." }, 400);
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key: KEY, keyLocation: `${site.replace(/\/$/, "")}/${KEY}.txt`, urlList: urls }),
    });
    // 200 and 202 both mean accepted.
    if (res.status !== 200 && res.status !== 202) return json({ error: `IndexNow answered ${res.status}: ${(await res.text()).slice(0, 200)}` }, 502);
    return json({ submitted: urls.length, status: res.status });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
