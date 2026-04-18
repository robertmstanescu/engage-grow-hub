/**
 * Edge Function: track-ai-crawler
 * ──────────────────────────────────────────────────────────────────────────
 * Receives a beacon from the client browser and, if the request's
 * User-Agent matches a known AI crawler, logs it to `ai_crawler_logs`.
 *
 * This complements the server-side logging in the `llms-txt` function —
 * together they catch both:
 *   1. Bots that crawl `/llms.txt` directly  (logged by llms-txt)
 *   2. Bots that fetch arbitrary pages and *do* execute JavaScript
 *      (e.g. Googlebot, Applebot — logged by this function)
 *
 * Bots that don't run JS (most pure-text crawlers) won't reach this.
 * That's a hard limitation of running on a SPA, and the dashboard
 * is honest about it.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const KNOWN_AI_CRAWLERS: { pattern: RegExp; name: string }[] = [
  { pattern: /GPTBot/i,              name: "GPTBot (OpenAI)" },
  { pattern: /ChatGPT-User/i,        name: "ChatGPT-User (OpenAI)" },
  { pattern: /OAI-SearchBot/i,       name: "OAI-SearchBot (OpenAI)" },
  { pattern: /anthropic-ai/i,        name: "anthropic-ai (Anthropic)" },
  { pattern: /Claude-Web/i,          name: "Claude-Web (Anthropic)" },
  { pattern: /ClaudeBot/i,           name: "ClaudeBot (Anthropic)" },
  { pattern: /Google-Extended/i,     name: "Google-Extended (Google)" },
  { pattern: /Googlebot/i,           name: "Googlebot (Google)" },
  { pattern: /PerplexityBot/i,       name: "PerplexityBot (Perplexity)" },
  { pattern: /xAI/i,                 name: "xAI-Crawler (xAI)" },
  { pattern: /Grok/i,                name: "Grok (xAI)" },
  { pattern: /Applebot-Extended/i,   name: "Applebot-Extended (Apple)" },
  { pattern: /Applebot/i,            name: "Applebot (Apple)" },
  { pattern: /Meta-ExternalAgent/i,  name: "Meta-ExternalAgent (Meta)" },
  { pattern: /FacebookBot/i,         name: "FacebookBot (Meta)" },
  { pattern: /CCBot/i,               name: "CCBot (Common Crawl)" },
  { pattern: /Bytespider/i,          name: "Bytespider (ByteDance)" },
  { pattern: /YouBot/i,              name: "YouBot (You.com)" },
  { pattern: /DuckAssistBot/i,       name: "DuckAssistBot (DuckDuckGo)" },
];

/**
 * Find a friendly bot name for a given User-Agent string.
 *
 * @param userAgent - The browser's `navigator.userAgent` (or request UA)
 * @returns The bot name, or `null` if no AI crawler signature matches.
 */
function identifyAiCrawler(userAgent: string): string | null {
  for (const { pattern, name } of KNOWN_AI_CRAWLERS) {
    if (pattern.test(userAgent)) return name;
  }
  return null;
}

/** Hash an IP for analytics-safe storage. */
async function hashIpAddress(ipAddress: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${ipAddress}|magiccoffin-ai-salt`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
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

  // The client sends the path it's currently viewing. The User-Agent
  // we trust is the *request's* UA header — never the body — because we
  // care about who actually sent the network request.
  let pagePath = "/";
  try {
    const body = await req.json();
    if (typeof body?.pagePath === "string" && body.pagePath.length < 500) {
      pagePath = body.pagePath;
    }
  } catch {
    // Empty body is fine — fall back to root.
  }

  const userAgent = req.headers.get("user-agent") || "";
  const detectedBotName = identifyAiCrawler(userAgent);

  // Not a bot? Return early without writing anything. We don't want to
  // log every human visit — the table would explode.
  if (!detectedBotName) {
    return new Response(JSON.stringify({ tracked: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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
    await supabaseAdmin.from("ai_crawler_logs").insert({
      bot_name: detectedBotName,
      user_agent: userAgent.slice(0, 500),
      page_path: pagePath,
      source: "client",
      ip_hash: ipHash,
    });
  } catch (insertError) {
    console.error("track-ai-crawler insert failed:", insertError);
    // Still respond 200 — telemetry must not affect the user's page.
  }

  return new Response(JSON.stringify({ tracked: true, botName: detectedBotName }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
