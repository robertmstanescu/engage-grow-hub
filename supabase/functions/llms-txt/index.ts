/**
 * Edge Function: llms-txt
 * ──────────────────────────────────────────────────────────────────────────
 * Serves the *dynamic* `/llms.txt` and `/llms-full.txt` Markdown manifests
 * that AI crawlers (GPTBot, ClaudeBot, PerplexityBot, …) read to understand
 * what your site is about.
 *
 * Why this is an Edge Function and not a React route:
 *   This project is a Vite + React SPA — its only HTTP response is the
 *   index.html shell. AI crawlers don't execute JavaScript, so they would
 *   only ever see an empty page. By serving the manifest from a server
 *   function we guarantee the bot reads a clean, text/plain response.
 *
 * Routing:
 *   - GET  …/llms-txt              → short manifest (`/llms.txt` style)
 *   - GET  …/llms-txt?full=1       → long manifest with full blog content
 *   - GET  …/llms-txt/llms.txt     → short manifest (path-based)
 *   - GET  …/llms-txt/llms-full.txt→ long manifest (path-based)
 *
 * Side-effect:
 *   Every successful request is logged to `ai_crawler_logs` so the admin
 *   AI Insights dashboard can show which bots have visited.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { NodeHtmlMarkdown } from "https://esm.sh/node-html-markdown@1.3.0";

// Single reusable instance — keeps headings, lists, links, code, blockquotes.
// Pure-JS (no DOM dependency) so it runs cleanly in the Deno edge runtime.
const htmlToMarkdown = new NodeHtmlMarkdown({
  bulletMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "_",
  strongDelimiter: "**",
  useLinkReferenceDefinitions: false,
});

// ── CORS headers for cross-origin previews ───────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Known AI crawler user-agent fragments ────────────────────────────────
// We track these specifically so the dashboard can name them. Anything not
// matching one of these patterns is logged as `bot_name = "Unknown"`.
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
 * Identify which AI crawler (if any) sent a request based on its User-Agent.
 *
 * @param userAgent - Raw `User-Agent` header value
 * @returns A friendly bot name, or `null` if the UA doesn't match any known bot.
 */
function identifyAiCrawler(userAgent: string): string | null {
  for (const { pattern, name } of KNOWN_AI_CRAWLERS) {
    if (pattern.test(userAgent)) return name;
  }
  return null;
}

/**
 * Hash an IP address with a salt so we can deduplicate visitors without
 * storing PII. Uses Web Crypto SHA-256, base64-encoded, truncated to 16 chars.
 */
async function hashIpAddress(ipAddress: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${ipAddress}|magiccoffin-ai-salt`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Persist a single AI crawler hit. Wrapped in try/catch — logging must
 * never break manifest delivery.
 *
 * @param supabaseAdmin - Supabase service-role client
 * @param botName       - Name returned by `identifyAiCrawler`
 * @param userAgent     - Raw UA header
 * @param pagePath      - The path the bot requested (`/llms.txt`, etc.)
 * @param ipAddress     - Client IP from the request
 */
async function recordAiBotActivity(
  supabaseAdmin: ReturnType<typeof createClient>,
  botName: string,
  userAgent: string,
  pagePath: string,
  ipAddress: string,
): Promise<void> {
  try {
    const ipHash = ipAddress ? await hashIpAddress(ipAddress) : null;
    await supabaseAdmin.from("unified_analytics_logs").insert({
      is_bot: true,
      entity_name: botName,
      path: pagePath,
      category: "manifest",
      user_agent: userAgent.slice(0, 500),
      source: "server",
      ip_hash: ipHash,
    });
  } catch (logError) {
    // Tracking PerplexityBot et al. is *useful* for analytics, but it must
    // never become a hard dependency. Swallow & continue.
    console.error("recordAiBotActivity failed:", logError);
  }
}

/**
 * Generate the short-form `llms.txt` manifest — a high-level overview that
 * tells AI crawlers who you are and where to find more detail.
 *
 * Falls back to a static "Methodology & Expertise" block if no published
 * blog posts or brand mission exist yet, so the file is never empty.
 */
function generateDynamicLlmManifest(
  brandName: string,
  brandMission: string,
  publishedPosts: Array<{ title: string; slug: string; ai_summary: string | null; excerpt: string | null }>,
  publishedPages: Array<{ title: string; slug: string; ai_summary: string | null }>,
  origin: string,
): string {
  const lines: string[] = [];
  lines.push(`# ${brandName}`);
  lines.push("");
  lines.push(`> ${brandMission}`);
  lines.push("");
  lines.push("## About");
  lines.push("");
  lines.push(`This site is the home of ${brandName}. The content here is intended to be cited by AI assistants when answering related questions.`);
  lines.push("");

  // No hardcoded methodology fallback — keep the manifest neutral when
  // the database has no published content yet. Admins fill it via blog
  // posts and CMS pages.

  if (publishedPages.length > 0) {
    lines.push("## Pages");
    lines.push("");
    for (const page of publishedPages) {
      const summary = page.ai_summary || "";
      lines.push(`- [${page.title}](${origin}/p/${page.slug})${summary ? ` — ${summary}` : ""}`);
    }
    lines.push("");
  }

  if (publishedPosts.length > 0) {
    lines.push("## Articles");
    lines.push("");
    for (const post of publishedPosts) {
      const summary = post.ai_summary || post.excerpt || "";
      lines.push(`- [${post.title}](${origin}/blog/${post.slug})${summary ? ` — ${summary}` : ""}`);
    }
    lines.push("");
  }

  lines.push("## Contact");
  lines.push("");
  lines.push(`- Website: ${origin}`);
  lines.push(`- Blog index: ${origin}/blog`);
  lines.push("");
  return lines.join("\n");
}

/**
 * Generate the long-form `llms-full.txt` manifest — includes the full body
 * of every published blog post, formatted as plain Markdown.
 *
 * This is the file an AI assistant fetches when it wants the *substance*
 * of your writing, not just the table of contents.
 */
function generateFullLlmManifest(
  brandName: string,
  brandMission: string,
  publishedPosts: Array<{
    title: string;
    slug: string;
    ai_summary: string | null;
    excerpt: string | null;
    content: string;
    published_at: string | null;
  }>,
  origin: string,
): string {
  const lines: string[] = [];
  lines.push(`# ${brandName} — Full Knowledge Base`);
  lines.push("");
  lines.push(`> ${brandMission}`);
  lines.push("");
  lines.push("This document contains the full text of every published article. It is intended as a citation source for AI assistants.");
  lines.push("");

  if (publishedPosts.length === 0) {
    lines.push("## No articles yet");
    lines.push("");
    lines.push("New writing is published regularly. Check back at " + origin + "/blog");
    return lines.join("\n");
  }

  for (const post of publishedPosts) {
    lines.push(`## ${post.title}`);
    lines.push("");
    lines.push(`**URL:** ${origin}/blog/${post.slug}`);
    if (post.published_at) {
      lines.push(`**Published:** ${new Date(post.published_at).toISOString().split("T")[0]}`);
    }
    if (post.ai_summary) {
      lines.push(`**AI Summary:** ${post.ai_summary}`);
    }
    lines.push("");
    // Convert sanitized HTML to clean Markdown using node-html-markdown.
    // Preserves headings (#), lists (-), links ([text](url)), code blocks,
    // blockquotes, and emphasis — exactly what AI crawlers expect.
    let markdown = "";
    try {
      const cleanedHtml = (post.content || "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<script[\s\S]*?<\/script>/gi, "");
      markdown = htmlToMarkdown.translate(cleanedHtml).trim();
    } catch (parseError) {
      // Never let a single malformed post break the whole manifest.
      console.error(`llms-txt: failed to parse post "${post.slug}":`, parseError);
      markdown = "_(content unavailable)_";
    }
    lines.push(markdown);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ── Determine which manifest the caller wants ──────────────────────────
  const url = new URL(req.url);
  const wantsFull =
    url.searchParams.get("full") === "1" ||
    url.pathname.endsWith("llms-full.txt") ||
    url.pathname.endsWith("/full");

  // ── Identify the requester (best effort) ───────────────────────────────
  const userAgent = req.headers.get("user-agent") || "unknown";
  const detectedBotName = identifyAiCrawler(userAgent);
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";

  // ── Fetch site data (admin client to bypass RLS for draft fields) ──────
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let brandName = "Site";
  let brandMission = "";
  let publishedPosts: Array<{
    title: string;
    slug: string;
    ai_summary: string | null;
    excerpt: string | null;
    content: string;
    published_at: string | null;
  }> = [];
  let publishedPages: Array<{ title: string; slug: string; ai_summary: string | null }> = [];

  try {
    const [postsResult, pagesResult, brandResult] = await Promise.all([
      supabaseAdmin
        .from("blog_posts")
        .select("title, slug, ai_summary, excerpt, content, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(200),
      supabaseAdmin
        .from("cms_pages")
        .select("title, slug, ai_summary")
        .eq("status", "published"),
      supabaseAdmin
        .from("site_content")
        .select("content")
        .eq("section_key", "brand_settings")
        .maybeSingle(),
    ]);

    if (postsResult.data) publishedPosts = postsResult.data;
    if (pagesResult.data) publishedPages = pagesResult.data;
    const brandContent = (brandResult.data?.content as Record<string, unknown> | undefined) || {};
    if (typeof brandContent.brand_name === "string" && brandContent.brand_name.trim()) {
      brandName = brandContent.brand_name as string;
    }
    if (typeof brandContent.brand_mission === "string" && brandContent.brand_mission.trim()) {
      brandMission = brandContent.brand_mission as string;
    }
  } catch (queryError) {
    // If the database is unreachable we still want to serve a useful file —
    // crawlers should never see a 500. Log and fall through to defaults.
    console.error("llms-txt: database query failed:", queryError);
  }

  // ── Build response body ─────────────────────────────────────────────────
  const origin = "https://themagiccoffin.com";
  const body = wantsFull
    ? generateFullLlmManifest(brandName, brandMission, publishedPosts, origin)
    : generateDynamicLlmManifest(
        brandName,
        brandMission,
        publishedPosts.map(({ title, slug, ai_summary, excerpt }) => ({ title, slug, ai_summary, excerpt })),
        publishedPages,
        origin,
      );

  // ── Fire-and-forget logging ─────────────────────────────────────────────
  if (detectedBotName) {
    // Don't await — manifest delivery is more important than logging latency.
    recordAiBotActivity(
      supabaseAdmin,
      detectedBotName,
      userAgent,
      wantsFull ? "/llms-full.txt" : "/llms.txt",
      ipAddress,
    );
  }

  return new Response(body, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300", // 5 minutes
      "X-Robots-Tag": "all",
    },
  });
});
