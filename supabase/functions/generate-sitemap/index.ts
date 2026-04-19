/**
 * ──────────────────────────────────────────────────────────────────────────
 * Edge Function: generate-sitemap
 * ──────────────────────────────────────────────────────────────────────────
 *
 * PURPOSE
 * ───────
 * Serves a fully-dynamic XML sitemap that always reflects the current state
 * of `cms_pages` and `blog_posts` (where status = 'published'). The output
 * conforms to the Sitemaps 0.9 schema published at:
 *   http://www.sitemaps.org/schemas/sitemap/0.9
 *
 * WHY THIS FUNCTION EXISTS
 * ────────────────────────
 * The previous `public/sitemap.xml` was a hand-edited static file. Every
 * time we published a new blog post or CMS page Google would not learn
 * about it until somebody manually re-edited the XML and redeployed.
 * This function eliminates that drift entirely — the XML is generated on
 * every request straight from the database, so the moment a row flips
 * from `draft` → `published` it appears in the next sitemap fetch.
 *
 * DEPLOYMENT / URL MAPPING (junior-engineer guide)
 * ────────────────────────────────────────────────
 * Lovable hosting CANNOT rewrite a path on the published domain to point
 * at a Supabase Edge Function — there is no equivalent of a Netlify
 * `_redirects` rule or a Vercel `vercel.json` rewrite that the platform
 * will honor. As a result:
 *
 *   1. This function is reachable directly at:
 *        https://<project-ref>.functions.supabase.co/generate-sitemap
 *      (or the equivalent `…/functions/v1/generate-sitemap` URL).
 *
 *   2. To preserve the canonical `https://themagiccoffin.com/sitemap.xml`
 *      URL that is already submitted to Google Search Console, the site
 *      owner places a Cloudflare Worker (or any HTTP proxy they control)
 *      in front of the apex domain that rewrites — NOT redirects —
 *      requests for `/sitemap.xml` to the function URL above. Google
 *      then sees a clean 200 response at the original URL.
 *
 *   3. DO NOT attempt to "fix" this with a 301 redirect or a Vite proxy.
 *      301s would change the URL Google indexes, and the Vite proxy only
 *      works in the local dev sandbox — production traffic never sees it.
 *
 * SCHEMA CHEAT SHEET
 * ──────────────────
 * <urlset>     ← root, declares the xmlns
 *   <url>      ← one entry per URL on the site
 *     <loc>           absolute URL (REQUIRED)
 *     <lastmod>       ISO-8601 date the resource last changed (optional)
 *     <changefreq>    hint for crawlers — always|hourly|daily|weekly|…
 *     <priority>      0.0 – 1.0 relative to other URLs on the same site
 *
 * Google ignores <priority> and <changefreq> in practice but they're
 * still valid and harmless. <lastmod> is the one Google actually uses to
 * decide whether to recrawl, so we include it for every dynamic row.
 *
 * CACHING
 * ───────
 * We send `Cache-Control: public, max-age=600` so the Cloudflare edge can
 * serve repeated crawls without hammering Postgres. Ten minutes is short
 * enough that newly-published rows still surface quickly.
 * ──────────────────────────────────────────────────────────────────────────
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// ── CORS — sitemaps are public, cross-origin GETs must succeed ──────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// The canonical, public origin we want Google to index. All <loc> entries
// are emitted with this prefix so they survive whatever proxy / Worker
// path the request actually entered through.
const CANONICAL_ORIGIN = "https://themagiccoffin.com";

/**
 * Escape characters that have special meaning inside XML element text.
 * Slugs and titles are user-controlled, so we MUST run this before
 * concatenating them into <loc> tags or we risk producing invalid XML
 * (and Google will reject the entire sitemap).
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build a single <url> block. Centralised so all entries share identical
 * formatting and ordering of children.
 */
function buildUrlEntry(
  loc: string,
  options: { lastmod?: string | null; changefreq?: string; priority?: string } = {},
): string {
  const parts: string[] = [`    <loc>${escapeXml(loc)}</loc>`];
  if (options.lastmod) {
    // Normalise to ISO-8601 calendar date (YYYY-MM-DD) — Google accepts
    // both full timestamps and date-only, but date-only avoids the appearance
    // of false precision when our `updated_at` values are auto-generated.
    const isoDate = new Date(options.lastmod).toISOString().split("T")[0];
    parts.push(`    <lastmod>${isoDate}</lastmod>`);
  }
  if (options.changefreq) parts.push(`    <changefreq>${options.changefreq}</changefreq>`);
  if (options.priority) parts.push(`    <priority>${options.priority}</priority>`);
  return `  <url>\n${parts.join("\n")}\n  </url>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Use the service-role client so we are not bound by RLS. Sitemap
  // generation only reads `status = 'published'` rows, all of which are
  // already publicly readable, so this widens nothing material.
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Fetched in parallel — both queries are independent and small enough
  // that issuing them serially would only add latency.
  let cmsPages: Array<{ slug: string; updated_at: string | null }> = [];
  let blogPosts: Array<{ slug: string; updated_at: string | null; published_at: string | null }> = [];

  try {
    const [pagesResult, postsResult] = await Promise.all([
      supabaseAdmin
        .from("cms_pages")
        .select("slug, updated_at")
        .eq("status", "published"),
      supabaseAdmin
        .from("blog_posts")
        .select("slug, updated_at, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false }),
    ]);
    if (pagesResult.data) cmsPages = pagesResult.data;
    if (postsResult.data) blogPosts = postsResult.data;
  } catch (error) {
    // Never 500 a sitemap. If the DB hiccups we still emit the static
    // root + blog index so Google has something valid to consume.
    console.error("generate-sitemap: query failed:", error);
  }

  // ── Assemble the XML body ─────────────────────────────────────────────
  // Static, always-present URLs first; dynamic rows after.
  const urlEntries: string[] = [
    buildUrlEntry(`${CANONICAL_ORIGIN}/`, { changefreq: "weekly", priority: "1.0" }),
    buildUrlEntry(`${CANONICAL_ORIGIN}/blog/`, { changefreq: "weekly", priority: "0.8" }),
  ];

  for (const page of cmsPages) {
    if (!page.slug) continue;
    urlEntries.push(
      buildUrlEntry(`${CANONICAL_ORIGIN}/p/${page.slug}/`, {
        lastmod: page.updated_at,
        changefreq: "monthly",
        priority: "0.7",
      }),
    );
  }

  for (const post of blogPosts) {
    if (!post.slug) continue;
    urlEntries.push(
      buildUrlEntry(`${CANONICAL_ORIGIN}/blog/${post.slug}/`, {
        // Prefer `published_at` over `updated_at` for blog lastmod —
        // editorial tweaks shouldn't make Google refetch every post.
        lastmod: post.published_at || post.updated_at,
        changefreq: "monthly",
        priority: "0.6",
      }),
    );
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n` +
    `        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n` +
    `        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9\n` +
    `        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n` +
    urlEntries.join("\n") +
    `\n</urlset>\n`;

  return new Response(xml, {
    status: 200,
    headers: {
      ...corsHeaders,
      // application/xml is the spec-compliant content type for sitemaps.
      // Google also accepts text/xml but application/xml is the modern norm.
      "Content-Type": "application/xml; charset=utf-8",
      // 10-minute edge cache — short enough that newly-published rows
      // surface quickly, long enough to absorb crawler bursts.
      "Cache-Control": "public, max-age=600",
      "X-Robots-Tag": "all",
    },
  });
});
