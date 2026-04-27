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
 * The HTML of `index.html` parsed into a real DOM, with <title>,
 * <meta name="description">, <link rel="canonical">, OG/Twitter tags
 * and JSON-LD upserted into <head> programmatically. A <noscript>
 * fallback is appended to <body> for crawlers that don't run JS.
 *
 * Why DOM-based injection (not regex/markers)
 * ───────────────────────────────────────────
 * The previous implementation relied on exact `<!-- SSR:* -->` HTML
 * comments in the index.html shell. An auto-formatter (Prettier, Vite
 * HTML transform, etc.) reflowing whitespace around those markers
 * would silently break the crawler view. Parsing into a real DOM with
 * `deno-dom` removes that fragility — head tags are looked up by
 * selector and replaced/inserted by name, so formatting changes in
 * the frontend project can no longer break SEO injection.
 *
 * Routing
 * ───────
 * The function dispatches on the `?path=` query parameter:
 *   /        → main_page_seo (homepage)
 *   /blog/:slug → that blog post
 *   /p/:slug    → that CMS page
 *   anything else → returns the neutral template untouched
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  DOMParser,
  Element,
  HTMLDocument,
} from "https://deno.land/x/deno_dom@v0.1.49/deno-dom-wasm.ts";

// ── CORS (the function may be hit by previews from various origins) ────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Last-resort canonical origin used only when the database is
 * unreachable AND the request URL doesn't reveal a public origin.
 * Tenants override this by setting `identity.canonicalOrigin` in the
 * `brand_settings` site_content row.
 */
const FALLBACK_ORIGIN = "https://example.com";

/**
 * Resolve the canonical origin in priority order:
 *   1. brand_settings.identity.canonicalOrigin (admin-configured)
 *   2. legacy brand_settings.canonical_origin (back-compat)
 *   3. The incoming request's origin if it isn't a Supabase function URL
 *   4. FALLBACK_ORIGIN
 */
const resolveOrigin = (
  brand: Record<string, any> | null | undefined,
  req: Request,
): string => {
  const identity = (brand?.identity as Record<string, any> | undefined) || {};
  const fromIdentity = typeof identity.canonicalOrigin === "string" ? identity.canonicalOrigin.trim() : "";
  if (fromIdentity) return fromIdentity.replace(/\/+$/, "");
  const legacy = typeof brand?.canonical_origin === "string" ? brand.canonical_origin.trim() : "";
  if (legacy) return legacy.replace(/\/+$/, "");
  try {
    const reqOrigin = new URL(req.url).origin;
    // Avoid leaking the supabase.co function origin into <link rel=canonical>.
    if (!/supabase\.co$/i.test(new URL(req.url).hostname)) return reqOrigin;
  } catch { /* noop */ }
  return FALLBACK_ORIGIN;
};

// Strip HTML tags from rich-text strings so they're safe for meta-tag content.
const stripHtml = (input: unknown): string =>
  String(input ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();

interface SeoPayload {
  title: string;
  description: string;
  canonical: string;
  ogImage: string | null;
  jsonLd: object | null;
  noscript: string;
}

/** Fetch the live published index.html. Falls back to a minimal shell. */
const fetchTemplate = async (req: Request): Promise<string> => {
  const reqOrigin = new URL(req.url).origin;
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
        // Sanity check — must look like a real HTML doc with a head.
        if (/<head[\s>]/i.test(text)) return text;
      }
    } catch {
      // try next candidate
    }
  }
  // Last-resort minimal shell.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>The Magic Coffin</title>
</head>
<body>
<div id="root"></div>
</body>
</html>`;
};

// ── DOM helpers ─────────────────────────────────────────────────────────

/**
 * Replace (or create) a single element in <head> matched by selector.
 * The new element inherits the given tag + attributes. Any prior matches
 * are removed so we never end up with duplicate <title> or canonical tags.
 */
const upsertHeadElement = (
  doc: HTMLDocument,
  head: Element,
  selector: string,
  tagName: string,
  attrs: Record<string, string>,
  textContent?: string,
): void => {
  for (const existing of Array.from(head.querySelectorAll(selector))) {
    (existing as Element).remove();
  }
  const el = doc.createElement(tagName);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  if (textContent !== undefined) {
    el.textContent = textContent;
  }
  head.appendChild(el);
};

const setTitle = (doc: HTMLDocument, head: Element, title: string) => {
  upsertHeadElement(doc, head, "title", "title", {}, title);
};

const setMetaName = (
  doc: HTMLDocument,
  head: Element,
  name: string,
  content: string,
) => {
  // Use attribute selector with quoted value to handle names containing colons (twitter:card).
  upsertHeadElement(
    doc,
    head,
    `meta[name="${name}"]`,
    "meta",
    { name, content },
  );
};

const setMetaProperty = (
  doc: HTMLDocument,
  head: Element,
  property: string,
  content: string,
) => {
  upsertHeadElement(
    doc,
    head,
    `meta[property="${property}"]`,
    "meta",
    { property, content },
  );
};

const setLinkRel = (
  doc: HTMLDocument,
  head: Element,
  rel: string,
  href: string,
) => {
  upsertHeadElement(
    doc,
    head,
    `link[rel="${rel}"]`,
    "link",
    { rel, href },
  );
};

const setJsonLd = (doc: HTMLDocument, head: Element, jsonLd: object | null) => {
  // Always strip any prior SSR-injected JSON-LD blocks so we don't stack them.
  for (const existing of Array.from(
    head.querySelectorAll('script[type="application/ld+json"][data-ssr="1"]'),
  )) {
    (existing as Element).remove();
  }
  if (!jsonLd) return;
  const el = doc.createElement("script");
  el.setAttribute("type", "application/ld+json");
  el.setAttribute("data-ssr", "1");
  el.textContent = JSON.stringify(jsonLd);
  head.appendChild(el);
};

const setNoscript = (doc: HTMLDocument, body: Element, payload: SeoPayload) => {
  // Remove any prior SSR noscript fallback before inserting a fresh one.
  for (const existing of Array.from(body.querySelectorAll('noscript[data-ssr="1"]'))) {
    (existing as Element).remove();
  }
  if (!payload.noscript) return;
  const el = doc.createElement("noscript");
  el.setAttribute("data-ssr", "1");
  // Build child nodes via the DOM so text content is automatically escaped.
  const h1 = doc.createElement("h1");
  h1.textContent = payload.title;
  const p = doc.createElement("p");
  p.textContent = payload.noscript;
  el.appendChild(h1);
  el.appendChild(p);
  body.appendChild(el);
};

/**
 * Apply the full SEO payload to the parsed document. Idempotent — running
 * twice with the same payload yields the same DOM.
 */
const applySeoToDocument = (doc: HTMLDocument, payload: SeoPayload): void => {
  const head = doc.querySelector("head") as Element | null;
  const body = doc.querySelector("body") as Element | null;
  if (!head) return;

  setTitle(doc, head, payload.title);
  if (payload.description) {
    setMetaName(doc, head, "description", payload.description);
  }
  setLinkRel(doc, head, "canonical", payload.canonical);

  // Open Graph
  setMetaProperty(doc, head, "og:type", "website");
  setMetaProperty(doc, head, "og:title", payload.title);
  if (payload.description) {
    setMetaProperty(doc, head, "og:description", payload.description);
  }
  setMetaProperty(doc, head, "og:url", payload.canonical);
  if (payload.ogImage) {
    setMetaProperty(doc, head, "og:image", payload.ogImage);
  }

  // Twitter
  setMetaName(doc, head, "twitter:card", "summary_large_image");
  setMetaName(doc, head, "twitter:title", payload.title);
  if (payload.description) {
    setMetaName(doc, head, "twitter:description", payload.description);
  }
  if (payload.ogImage) {
    setMetaName(doc, head, "twitter:image", payload.ogImage);
  }

  setJsonLd(doc, head, payload.jsonLd);
  if (body) setNoscript(doc, body, payload);
};

/**
 * Serialize the document back to an HTML string with a doctype prefix
 * (deno-dom's outerHTML doesn't include the doctype).
 */
const serializeDocument = (doc: HTMLDocument): string => {
  const root = doc.documentElement;
  const html = root ? root.outerHTML : "";
  return `<!doctype html>\n${html}`;
};

// ── SEO builders ────────────────────────────────────────────────────────

const buildHomeSeo = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
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

const buildBlogSeo = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
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

const buildCmsSeo = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
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

const resolvePath = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  path: string,
): Promise<SeoPayload | null> => {
  const cleanPath = path.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";

  if (cleanPath === "/" || cleanPath === "") {
    return buildHomeSeo(supabase);
  }
  const blogMatch = cleanPath.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) return buildBlogSeo(supabase, blogMatch[1]);
  const cmsMatch = cleanPath.match(/^\/p\/([^/]+)$/);
  if (cmsMatch) return buildCmsSeo(supabase, cmsMatch[1]);
  return null;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path") || "/";

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
      const doc = new DOMParser().parseFromString(template, "text/html");
      if (doc) {
        applySeoToDocument(doc, payload);
        html = serializeDocument(doc);
      } else {
        // Parse failed — fall back to the unmodified template rather than 5xx.
        console.warn("ssr-index: DOMParser returned null, serving raw template");
      }
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
