/**
 * Edge Function: track-visitor
 * ──────────────────────────────────────────────────────────────────────────
 * Single beacon endpoint for both human and bot traffic. The client fires
 * one POST per route change; the function:
 *
 *   1. Inspects the request's User-Agent (NOT anything in the body) to
 *      decide whether the caller is a known crawler / scraper / headless
 *      browser. If so, the row is flagged `is_bot = true` and excluded
 *      from "human" dashboard counts.
 *   2. Extracts country from `CF-IPCountry` (or, in dev/preview, the
 *      `x-forwarded-for` header → falls back to "Unknown").
 *   3. Hashes the IP with a salt for de-duplication without storing PII.
 *   4. Inserts ONE row into `unified_analytics_logs` describing the hit.
 *
 * Errors are swallowed and a 200 returned — telemetry must never block
 * page rendering. The client uses `supabase.functions.invoke` so even a
 * 5xx here doesn't propagate to React.
 *
 * ──────────────────────────────────────────────────────────────────────────
 *  WHY WE GO HARD ON BOT FILTERING (read me, junior dev!)
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Analytics are USELESS if half the rows come from scrapers. Two specific
 * failure modes inflate "human" counts and pollute every dashboard chart:
 *
 *   1. Scrapers that don't bother spoofing a real browser UA:
 *      `python-requests/2.x`, `curl/8.x`, `Go-http-client`, etc. These are
 *      cheap to detect by substring match. If we don't, every cron-job
 *      hitting our pages bumps "Human Reach".
 *
 *   2. Headless / automation runtimes:
 *      `HeadlessChrome`, `Puppeteer`, `Selenium`, `Playwright`. Marketing
 *      tools, SEO crawlers, and uptime monitors all use these. They look
 *      almost-human if you only check for `Mozilla` so we explicitly
 *      pattern-match the giveaway tokens.
 *
 *   3. Empty User-Agent:
 *      Real browsers ALWAYS send a UA. An empty string is a near-100%
 *      signal of a scripted client (custom HTTP client, network probe,
 *      half-broken integration). We therefore treat empty UA as a bot
 *      with a dedicated label so we can monitor that volume separately.
 *
 * Flagging these as bots doesn't drop the row — it still gets stored, it
 * just goes into the bot bucket so you can audit the volume on the
 * dashboard's "Bot Leaderboard" panel without it skewing humans.
 *
 * ──────────────────────────────────────────────────────────────────────────
 *  DEDUPLICATION HIERARCHY (visitorId vs ip_hash)
 * ──────────────────────────────────────────────────────────────────────────
 *
 * To count "unique humans" the dashboard groups rows by an identity key.
 * That key is computed in `countUniqueHumanVisitors` like this:
 *
 *     identityKey = visitor_id ?? ip_hash
 *
 * `visitor_id` is the PRIMARY source of truth because:
 *   • It's persisted in localStorage on the client, so it survives IP
 *     changes (mobile carriers, VPNs, NAT swaps, switching wifi).
 *   • One person on three networks still maps to ONE visitor_id.
 *
 * `ip_hash` is the FALLBACK. It only matters when:
 *   • The client is too old / too locked-down to give us localStorage
 *     (some privacy modes wipe it on every tab close).
 *   • The very first beacon fires before our React effect has a chance
 *     to mint the visitor_id (rare; we initialise eagerly).
 *
 * It's strictly secondary because IPs are unstable: shared NATs make
 * many people look like one (under-count), and dynamic ISPs make one
 * person look like many (over-count). Using IP as the primary key is
 * how every "30k unique visitors!!!" stat ends up being a lie.
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

/**
 * Master bot list — combines AI crawlers, search engine spiders, SEO
 * scrapers, headless automation runtimes, and generic HTTP clients.
 *
 * ORDER MATTERS for the friendly name only (first match wins). Patterns
 * are case-insensitive. When adding a new entry, prefer the most
 * specific token possible so we don't false-positive real browsers.
 */
const KNOWN_BOTS: { pattern: RegExp; name: string }[] = [
  // ── AI training & answer-engine crawlers ──────────────────────────────
  { pattern: /GPTBot/i,             name: "GPTBot (OpenAI)" },
  { pattern: /ChatGPT-User/i,       name: "ChatGPT-User (OpenAI)" },
  { pattern: /OAI-SearchBot/i,      name: "OAI-SearchBot (OpenAI)" },
  { pattern: /anthropic-ai/i,       name: "anthropic-ai (Anthropic)" },
  { pattern: /Claude-Web/i,         name: "Claude-Web (Anthropic)" },
  { pattern: /ClaudeBot/i,          name: "ClaudeBot (Anthropic)" },
  { pattern: /Google-Extended/i,    name: "Google-Extended (Google)" },
  { pattern: /PerplexityBot/i,      name: "PerplexityBot (Perplexity)" },
  { pattern: /xAI/i,                name: "xAI-Crawler (xAI)" },
  { pattern: /Grok/i,               name: "Grok (xAI)" },
  { pattern: /Applebot-Extended/i,  name: "Applebot-Extended (Apple)" },
  { pattern: /Meta-ExternalAgent/i, name: "Meta-ExternalAgent (Meta)" },
  { pattern: /FacebookBot/i,        name: "FacebookBot (Meta)" },
  { pattern: /CCBot/i,              name: "CCBot (Common Crawl)" },
  { pattern: /Bytespider/i,         name: "Bytespider (ByteDance)" },
  { pattern: /YouBot/i,             name: "YouBot (You.com)" },
  { pattern: /DuckAssistBot/i,      name: "DuckAssistBot (DuckDuckGo)" },

  // ── Classic search engines ────────────────────────────────────────────
  { pattern: /Googlebot/i,          name: "Googlebot (Google)" },
  { pattern: /bingbot/i,            name: "Bingbot (Microsoft)" },
  { pattern: /Baiduspider/i,        name: "Baiduspider (Baidu)" },
  { pattern: /YandexBot/i,          name: "YandexBot (Yandex)" },
  { pattern: /Applebot/i,           name: "Applebot (Apple)" },
  { pattern: /DuckDuckBot/i,        name: "DuckDuckBot (DuckDuckGo)" },

  // ── SEO / marketing scrapers ──────────────────────────────────────────
  { pattern: /AhrefsBot/i,          name: "AhrefsBot (Ahrefs)" },
  { pattern: /SemrushBot/i,         name: "SemrushBot (Semrush)" },
  { pattern: /MJ12bot/i,            name: "MJ12bot (Majestic)" },
  { pattern: /DotBot/i,             name: "DotBot (Moz)" },
  { pattern: /rogerbot/i,           name: "rogerbot (Moz)" },
  { pattern: /SiteAuditBot/i,       name: "SiteAuditBot" },
  { pattern: /Screaming\s?Frog/i,   name: "Screaming Frog SEO Spider" },

  // ── Social media link previews ────────────────────────────────────────
  { pattern: /Discordbot/i,         name: "Discordbot" },
  { pattern: /Twitterbot/i,         name: "Twitterbot" },
  { pattern: /Slackbot/i,           name: "Slackbot" },
  { pattern: /facebookexternalhit/i, name: "facebookexternalhit (Meta)" },
  { pattern: /LinkedInBot/i,        name: "LinkedInBot" },
  { pattern: /Pinterestbot/i,       name: "Pinterestbot" },
  { pattern: /WhatsApp/i,           name: "WhatsApp" },
  { pattern: /TelegramBot/i,        name: "TelegramBot" },

  // ── Headless browsers / automation runtimes ───────────────────────────
  // These tokens leak through even if the script tries to look human.
  { pattern: /HeadlessChrome/i,     name: "HeadlessChrome" },
  { pattern: /Puppeteer/i,          name: "Puppeteer" },
  { pattern: /Playwright/i,         name: "Playwright" },
  { pattern: /Selenium/i,           name: "Selenium" },
  { pattern: /PhantomJS/i,          name: "PhantomJS" },
  { pattern: /Cypress/i,            name: "Cypress" },

  // ── Generic HTTP clients (anything not pretending to be a browser) ────
  { pattern: /^curl\//i,            name: "curl" },
  { pattern: /^Wget\//i,            name: "wget" },
  { pattern: /python-requests/i,    name: "python-requests" },
  { pattern: /python-urllib/i,      name: "python-urllib" },
  { pattern: /\burllib\b/i,         name: "urllib" },
  { pattern: /\bGo-http-client\b/i, name: "Go-http-client" },
  { pattern: /\bnode-fetch\b/i,     name: "node-fetch" },
  { pattern: /\baxios\b/i,          name: "axios" },
  { pattern: /\bokhttp\b/i,         name: "okhttp" },
  { pattern: /\blibwww-perl\b/i,    name: "libwww-perl" },
  { pattern: /\bJava\//i,           name: "Java HTTP client" },
  { pattern: /\bRuby\b/i,           name: "Ruby HTTP client" },

  // ── Generic last-ditch tokens (catches things like AmazonBot, MegaIndex) ──
  { pattern: /\bcrawler\b/i,        name: "Generic crawler" },
  { pattern: /\bspider\b/i,         name: "Generic spider" },
  { pattern: /\bscraper\b/i,        name: "Generic scraper" },
  { pattern: /\bbot\b/i,            name: "Generic bot" },
];

/**
 * Identify a User-Agent against our master bot list.
 *
 * Special-case: an empty / whitespace-only User-Agent is itself a strong
 * bot signal. Real browsers send something. Empty UA is almost always a
 * scripted client (custom HTTP, half-broken integration, network probe).
 *
 * @param userAgent - Raw `User-Agent` header value
 * @returns Friendly bot name, or `null` for non-bot UAs.
 */
function identifyBot(userAgent: string): string | null {
  // Empty UA → always a bot. We give it a dedicated name so dashboards
  // can see how much "stealth scraper" volume we get separately from the
  // chatty named ones.
  if (!userAgent || userAgent.trim() === "") return "Empty UA Bot";

  for (const { pattern, name } of KNOWN_BOTS) {
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
 *
 * REMINDER: ip_hash is a SECONDARY dedup key. Always prefer visitor_id
 * (which the client persists in localStorage and re-sends on every
 * beacon) — see the file header for why.
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
  let attribution: Record<string, string> | null = null;

  try {
    const body = await req.json();
    pagePath = truncate(body?.pagePath, 500) || "/";
    clientBrowser = truncate(body?.browser, 50);
    clientDevice = truncate(body?.device, 30);
    referrer = truncate(body?.referrer, 500);
    searchEngine = body?.searchEngine ? truncate(body.searchEngine, 50) : null;
    // visitor_id is the PRIMARY dedup key — see file header. We accept up
    // to 64 chars to fit a UUID v4 (36 chars) plus any future namespace.
    visitorId = body?.visitorId ? truncate(body.visitorId, 64) : null;
    // Epic 4 / US 4.1 — marketing attribution snapshot from the client.
    // We accept whatever keys the client sends but coerce values to
    // strings of bounded length so a malicious 4MB blob can't pollute
    // the analytics table.
    attribution = sanitizeAttribution(body?.attribution);
  } catch {
    // Empty body is fine — fall back to defaults.
  }

  // ── Identify caller from HEADERS (never trust the body for this). ─────
  const userAgent = req.headers.get("user-agent") || "";
  const detectedBotName = identifyBot(userAgent);
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
