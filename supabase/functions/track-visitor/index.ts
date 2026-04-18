/**
 * Edge Function: track-visitor
 * ──────────────────────────────────────────────────────────────────────────
 * Single beacon endpoint for both human and bot traffic. The client fires
 * one POST per route change; the function:
 *
 *   1. Inspects the request's User-Agent (NOT anything in the body) to
 *      decide whether the caller is a known AI crawler.
 *   2. Extracts country from `CF-IPCountry` (or, in dev/preview, the
 *      `x-forwarded-for` header → falls back to "Unknown").
 *   3. Hashes the IP with a salt for de-duplication without storing PII.
 *   4. Inserts ONE row into `unified_analytics_logs` describing the hit.
 *
 * Errors are swallowed and a 200 returned — telemetry must never block
 * page rendering. The client uses `supabase.functions.invoke` so even a
 * 5xx here doesn't propagate to React.
 *
 * @see src/services/analytics.ts for the corresponding client helpers.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// ── CORS — every browser-originating call needs this preflight. ──────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Known AI crawlers — the 2026 "Omni-List" requested in the spec. ──────
// Tracking each one matters because: GPTBot/Claude/Perplexity drive citations
// in their respective answer engines; Googlebot still drives the open web;
// Applebot-Extended is the new entry to watch as Apple Intelligence ramps up.
const KNOWN_AI_CRAWLERS: { pattern: RegExp; name: string }[] = [
  { pattern: /GPTBot/i,             name: "GPTBot (OpenAI)" },
  { pattern: /ChatGPT-User/i,       name: "ChatGPT-User (OpenAI)" },
  { pattern: /OAI-SearchBot/i,      name: "OAI-SearchBot (OpenAI)" },
  { pattern: /anthropic-ai/i,       name: "anthropic-ai (Anthropic)" },
  { pattern: /Claude-Web/i,         name: "Claude-Web (Anthropic)" },
  { pattern: /ClaudeBot/i,          name: "ClaudeBot (Anthropic)" },
  { pattern: /Google-Extended/i,    name: "Google-Extended (Google)" },
  { pattern: /Googlebot/i,          name: "Googlebot (Google)" },
  { pattern: /PerplexityBot/i,      name: "PerplexityBot (Perplexity)" },
  { pattern: /xAI/i,                name: "xAI-Crawler (xAI)" },
  { pattern: /Grok/i,               name: "Grok (xAI)" },
  { pattern: /Applebot-Extended/i,  name: "Applebot-Extended (Apple)" },
  { pattern: /Applebot/i,           name: "Applebot (Apple)" },
  { pattern: /Meta-ExternalAgent/i, name: "Meta-ExternalAgent (Meta)" },
  { pattern: /FacebookBot/i,        name: "FacebookBot (Meta)" },
  { pattern: /CCBot/i,              name: "CCBot (Common Crawl)" },
  { pattern: /Bytespider/i,         name: "Bytespider (ByteDance)" },
  { pattern: /YouBot/i,             name: "YouBot (You.com)" },
  { pattern: /DuckAssistBot/i,      name: "DuckAssistBot (DuckDuckGo)" },
];

/**
 * Check a User-Agent against the known-bot list.
 *
 * @param userAgent - Raw `User-Agent` header value
 * @returns Friendly bot name, or `null` for non-bot UAs.
 */
function identifyAiCrawler(userAgent: string): string | null {
  for (const { pattern, name } of KNOWN_AI_CRAWLERS) {
    if (pattern.test(userAgent)) return name;
  }
  return null;
}

/**
 * Categorise a request path the same way the client does. Centralising
 * here means the bucket counts on the dashboard always agree no matter
 * which logger wrote the row.
 */
function classifyPathCategory(path: string): "blog" | "page" | "manifest" | "other" {
  if (path.startsWith("/blog/")) return "blog";
  if (path.startsWith("/p/")) return "page";
  if (path === "/llms.txt" || path === "/llms-full.txt") return "manifest";
  return "other";
}

/**
 * Hash an IP address with a project-specific salt and truncate to 24 hex
 * chars. Enough entropy to deduplicate within a session, not enough to
 * reverse to the original IP.
 */
async function hashIpAddress(ipAddress: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${ipAddress}|magiccoffin-analytics-salt`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 12).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Coerce an arbitrary string to a max length while preserving UTF-8.
 */
function truncate(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.length > max ? value.slice(0, max) : value;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Parse client body. We accept partial bodies so a malformed beacon
  //    still produces a useful row instead of being dropped. ───────────
  let pagePath = "/";
  let clientBrowser = "";
  let clientDevice = "";
  let referrer = "";
  let searchEngine: string | null = null;
  let visitorId: string | null = null;

  try {
    const body = await req.json();
    pagePath = truncate(body?.pagePath, 500) || "/";
    clientBrowser = truncate(body?.browser, 50);
    clientDevice = truncate(body?.device, 30);
    referrer = truncate(body?.referrer, 500);
    searchEngine = body?.searchEngine ? truncate(body.searchEngine, 50) : null;
    visitorId = body?.visitorId ? truncate(body.visitorId, 64) : null;
  } catch {
    // Empty body is fine — fall back to defaults.
  }

  // ── Identify caller from HEADERS (never trust the body for this). ─────
  const userAgent = req.headers.get("user-agent") || "";
  const detectedBotName = identifyAiCrawler(userAgent);
  const isBot = !!detectedBotName;

  // Country: Cloudflare adds CF-IPCountry on every request that goes
  // through their network. In Supabase Edge (Deno Deploy) this header
  // is also populated for real production traffic. Local dev returns
  // "Unknown" which is the right behaviour.
  const country =
    req.headers.get("cf-ipcountry") ||
    req.headers.get("x-vercel-ip-country") ||
    null;

  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const ipHash = ipAddress ? await hashIpAddress(ipAddress) : null;

    await supabaseAdmin.from("unified_analytics_logs").insert({
      is_bot: isBot,
      entity_name: detectedBotName ?? "Human",
      path: pagePath,
      category: classifyPathCategory(pagePath),
      referrer: referrer || null,
      search_engine: searchEngine,
      browser: clientBrowser || null,
      device: clientDevice || null,
      country,
      visitor_id: visitorId,
      user_agent: userAgent.slice(0, 500),
      ip_hash: ipHash,
      source: "client",
    });
  } catch (insertError) {
    console.error("track-visitor insert failed:", insertError);
    // Still 200 — analytics must not affect the visitor's experience.
  }

  return new Response(
    JSON.stringify({ tracked: true, isBot, entityName: detectedBotName ?? "Human" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
