/**
 * Edge Function: ssr-index
 * ─────────────────────────────────────────────────────────────────────────
 * Server-side renders the head/meta of index.html for crawlers, social
 * scrapers and AI agents (Googlebot, GPTBot, ClaudeBot, PerplexityBot,
 * facebookexternalhit, Twitterbot, LinkedInBot, WhatsApp, Slackbot,
 * Discordbot, TelegramBot, etc.).
 *
 * Real users with JavaScript NEVER hit this function — they're served
 * the static `index.html` directly by Lovable's hosting. A Cloudflare
 * Worker (Phase 2) inspects the User-Agent header and proxies bot
 * traffic here instead.
 *
 * What this function returns
 * ───────────────────────────
 * The HTML of `index.html` with the SSR_* marker pairs replaced by
 * fresh, database-driven values. Crawlers see the latest admin-edited
 * title, description, OG tags, JSON-LD and a `<noscript>` fallback
 * containing a meaningful summary of the page.
 *
 * Routing
 * ───────
 * The function dispatches on the `?path=` query parameter:
 *   /        → main_page_seo (homepage)
 *   /blog/:slug → that blog post
 *   /p/:slug    → that CMS page
 *   anything else → returns the neutral template untouched
 *
 * Why we fetch the static template at runtime instead of bundling it
 * ──────────────────────────────────────────────────────────────────
 * Bundling would require redeploying the function every time the
 * `index.html` shell changes. Fetching the live `index.html` from the
 * deployed origin keeps the SSR output in lock-step with the SPA.
 * If the origin is unreachable we fall back to a minimal template so
 * crawlers never get a 5xx.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// ── CORS (the function may be hit by previews from various origins) ────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CANONICAL_ORIGIN = "https://themagiccoffin.com";

// ── Tiny HTML escape (we never trust DB content with raw HTML in <head>) ──
const escapeHtml = (input: unknown): string =>
  String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Strip HTML tags from rich-text strings so they're safe for meta-tag content.
const stripHtml = (input: unknown): string =>
  String(input ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();

const ensureTrailingSlash = (path: string) => (path.endsWith("/") ? path : `${path}/`);

interface SeoPayload {
  title: string;
  description: string;
  canonical: string;
  ogImage: string | null;
  jsonLd: object | null;
  noscript: string;
}

/** Replace the contents between `<!--MARKER-->…<!--/MARKER-->` (inclusive of inner). */
const replaceMarker = (html: string, marker: string, replacement: string): string => {
  // Escape the marker name for regex safety. Markers are simple ASCII so
  // this is mostly defensive — but better safe than sorry.
  const safe = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<!--${safe}-->[\\s\\S]*?<!--/${safe}-->`, "g");
  return html.replace(re, `<!--${marker}-->${replacement}<!--/${marker}-->`);
};

const buildOgTags = (payload: SeoPayload): string => {
  const parts: string[] = [];
  parts.push(`<meta property="og:type" content="website" />`);
  parts.push(`<meta property="og:title" content="${escapeHtml(payload.title)}" />`);
  if (payload.description) {
    parts.push(`<meta property="og:description" content="${escapeHtml(payload.description)}" />`);
  }
  parts.push(`<meta property="og:url" content="${escapeHtml(payload.canonical)}" />`);
  if (payload.ogImage) {
    parts.push(`<meta property="og:image" content="${escapeHtml(payload.ogImage)}" />`);
  }
  parts.push(`<meta name="twitter:card" content="summary_large_image" />`);
  parts.push(`<meta name="twitter:title" content="${escapeHtml(payload.title)}" />`);
  if (payload.description) {
    parts.push(`<meta name="twitter:description" content="${escapeHtml(payload.description)}" />`);
  }
  if (payload.ogImage) {
    parts.push(`<meta name="twitter:image" content="${escapeHtml(payload.ogImage)}" />`);
  }
  return parts.join("\n    ");
};

const buildJsonLd = (payload: SeoPayload): string => {
  if (!payload.jsonLd) return "";
  return `<script type="application/ld+json">${JSON.stringify(payload.jsonLd)}</script>`;
};

const buildNoscript = (payload: SeoPayload): string => {
  if (!payload.noscript) return "";
  // <noscript> fallback for the tiny slice of crawlers that don't run JS
  // (and for users who have JS disabled). Plain text only — no markup.
  return `<noscript><h1>${escapeHtml(payload.title)}</h1><p>${escapeHtml(payload.noscript)}</p></noscript>`;
};

/** Fetch the live published index.html. Falls back to a minimal shell. */
const fetchTemplate = async (req: Request): Promise<string> => {
  // Use the request origin so this works for both production and preview.
  const reqOrigin = new URL(req.url).origin;
  // We can't fetch index.html from supabase.co — try the canonical origin first.
  const candidates = [
    "https://themagiccoffin.com/index.html",
    "https://themagiccoffin.lovable.app/index.html",
    `${reqOrigin}/index.html`,
  ];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { headers: { "Cache-Control": "no-cache" } });
      if (res.ok) {
        const text = await res.text();
        // Sanity check — must contain at least one of our SSR markers.
        if (text.includes("<!--SSR_TITLE-->")) return text;
      }
    } catch {
      // try next candidate
    }
  }
  // Last-resort minimal template (matches index.html marker layout).
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><title><!--SSR_TITLE-->The Magic Coffin<!--/SSR_TITLE--></title><meta name="description" content="<!--SSR_DESCRIPTION--><!--/SSR_DESCRIPTION-->"><link rel="canonical" href="<!--SSR_CANONICAL-->https://themagiccoffin.com/<!--/SSR_CANONICAL-->"><!--SSR_OG_TAGS--><!--/SSR_OG_TAGS--><!--SSR_JSONLD--><!--/SSR_JSONLD--></head><body><div id="root"></div><!--SSR_NOSCRIPT--><!--/SSR_NOSCRIPT--></body></html>`;
};

/** Build SEO payload for the homepage from the `main_page_seo` site_content row. */
const buildHomeSeo = async (
  supabase: ReturnType<typeof createClient>,
): Promise<SeoPayload> => {
  const [{ data: seo }, { data: brand }] = await Promise.all([
    supabase.from("site_content").select("content").eq("section_key", "main_page_seo").maybeSingle(),
    supabase.from("site_content").select("content").eq("section_key", "brand_settings").maybeSingle(),
  ]);
  const seoContent = (seo?.content as Record<string, any>) || {};
  const brandContent = (brand?.content as Record<string, any>) || {};
  const title = seoContent.meta_title || brandContent.brand_name || "The Magic Coffin";
  const description = seoContent.meta_description || brandContent.brand_mission || "";
  const ogImage = seoContent.og_image || brandContent.og_image || null;
  return {
    title,
    description,
    canonical: `${CANONICAL_ORIGIN}/`,
    ogImage,
    jsonLd: brandContent.brand_name
      ? {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: brandContent.brand_name,
          url: CANONICAL_ORIGIN,
        }
      : null,
    noscript: seoContent.ai_summary || description,
  };
};

/** Build SEO payload for a blog post. */
const buildBlogSeo = async (
  supabase: ReturnType<typeof createClient>,
  slug: string,
): Promise<SeoPayload | null> => {
  const { data } = await supabase
    .from("blog_posts")
    .select("title, excerpt, meta_title, meta_description, ai_summary, cover_image, og_image, published_at")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!data) return null;
  const post = data as Record<string, any>;
  const title = post.meta_title || post.title || "The Magic Coffin";
  const description = post.meta_description || stripHtml(post.excerpt) || "";
  const ogImage = post.og_image || post.cover_image || null;
  return {
    title,
    description,
    canonical: `${CANONICAL_ORIGIN}/blog/${slug}/`,
    ogImage,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description,
      datePublished: post.published_at,
      mainEntityOfPage: `${CANONICAL_ORIGIN}/blog/${slug}/`,
      ...(ogImage ? { image: ogImage } : {}),
    },
    noscript: post.ai_summary || description,
  };
};

/** Build SEO payload for a CMS page. */
const buildCmsSeo = async (
  supabase: ReturnType<typeof createClient>,
  slug: string,
): Promise<SeoPayload | null> => {
  const { data } = await supabase
    .from("cms_pages")
    .select("title, meta_title, meta_description, ai_summary")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!data) return null;
  const page = data as Record<string, any>;
  const title = page.meta_title || page.title || "The Magic Coffin";
  const description = page.meta_description || "";
  return {
    title,
    description,
    canonical: `${CANONICAL_ORIGIN}/p/${slug}/`,
    ogImage: null,
    jsonLd: null,
    noscript: page.ai_summary || description,
  };
};

/**
 * Resolve a path string to its SeoPayload by dispatching on shape.
 * Returns `null` if the path doesn't map to a known content source —
 * the caller will return the neutral template untouched.
 */
const resolvePath = async (
  supabase: ReturnType<typeof createClient>,
  path: string,
): Promise<SeoPayload | null> => {
  // Normalise: strip query/hash, collapse trailing slash for matching.
  const cleanPath = path.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";

  if (cleanPath === "/" || cleanPath === "") {
    return buildHomeSeo(supabase);
  }
  const blogMatch = cleanPath.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) return buildBlogSeo(supabase, blogMatch[1]);
  const cmsMatch = cleanPath.match(/^\/p\/([^/]+)$/);
  if (cmsMatch) return buildCmsSeo(supabase, cmsMatch[1]);
  // Unknown path → neutral template
  return null;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path") || "/";

    // Two parallel reads: template + SEO payload (admin client to bypass RLS).
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [template, payload] = await Promise.all([
      fetchTemplate(req),
      resolvePath(supabaseAdmin, path),
    ]);

    let html = template;
    if (payload) {
      html = replaceMarker(html, "SSR_TITLE", escapeHtml(payload.title));
      html = replaceMarker(html, "SSR_DESCRIPTION", escapeHtml(payload.description));
      html = replaceMarker(html, "SSR_CANONICAL", escapeHtml(payload.canonical));
      html = replaceMarker(html, "SSR_OG_TAGS", buildOgTags(payload));
      html = replaceMarker(html, "SSR_JSONLD", buildJsonLd(payload));
      html = replaceMarker(html, "SSR_NOSCRIPT", buildNoscript(payload));
    }

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        // Short cache so admin edits propagate quickly but bots aren't
        // hammering the function on every fetch.
        "Cache-Control": "public, s-maxage=300, max-age=60",
        "X-Robots-Tag": "all",
      },
    });
  } catch (err) {
    console.error("ssr-index error:", err);
    // Never serve a 5xx to a crawler — return the neutral template.
    const fallback = await fetchTemplate(req);
    return new Response(fallback, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }
});
