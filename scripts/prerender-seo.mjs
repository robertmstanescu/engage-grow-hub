/**
 * BUILD-TIME SEO PRERENDER
 * ────────────────────────────────────────────────────────────────────────
 * Runs as `postbuild`, i.e. AFTER `vite build`, so it can start from the
 * production `dist/index.html` (hashed asset URLs already in place) and
 * simply rewrite the <head> per route.
 *
 * WHY THIS EXISTS
 * ───────────────
 * This app is a client-rendered SPA. `usePageMeta` rewrites the head at
 * runtime, which works for humans but NOT for Googlebot's initial fetch,
 * and not at all for social scrapers (LinkedIn, Slack, Facebook, X) or AI
 * crawlers, none of which execute JavaScript. Before this script, every
 * URL served the homepage's title/description/canonical — meaning every
 * subpage told Google "canonical = homepage", i.e. do not index me.
 *
 * Lovable hosting serves a real file at a path before falling back to the
 * SPA shell, so writing `dist/services/foo/index.html` means a crawler
 * requesting `/services/foo/` gets that page's own tags. The React app
 * still boots on top of it exactly as before.
 *
 * Data comes straight from the database over PostgREST (no extra deps),
 * so the tags always match what the CMS/SEO admin panels wrote. Tags are
 * baked at publish time: a metadata edit reaches crawlers on next publish.
 *
 * This script also emits the authoritative `sitemap.xml` and `llms.txt`.
 * The static copies in `public/` were deleted — do not reintroduce them.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";

/* ── Config ─────────────────────────────────────────────────────────── */

/** Hard ceiling on generated files — publishing rejects huge outputs. */
const MAX_PRERENDER_PAGES = 2000;

const DIST = resolve("dist");
const DEFAULT_OG_IMAGE_PATH = "/og-image.jpg";

/* ── Env (postbuild runs under plain node; .env is not auto-loaded) ──── */

function loadEnv() {
  const env = { ...process.env };
  const envPath = resolve(".env");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;

/* ── Tiny PostgREST client ──────────────────────────────────────────── */

async function rest(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`PostgREST ${path} failed [${res.status}]: ${await res.text()}`);
  return res.json();
}

/* ── Helpers ────────────────────────────────────────────────────────── */

const escapeHtml = (v = "") =>
  String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const escapeXml = (v = "") =>
  String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const trailing = (p) => (p.endsWith("/") ? p : `${p}/`);

/**
 * Public URL path for a CMS page slug. Mirrors the router: namespaced
 * `services/...` slugs and the services index live at the site root,
 * everything else is served from `/p/`.
 */
const cmsPagePath = (slug) =>
  slug === "services" || slug.startsWith("services/") ? `/${trailing(slug)}` : `/p/${trailing(slug)}`;

/** Strip HTML/markdown noise down to a plain-text snippet. */
const plain = (v, max = 200) => {
  const s = String(v || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
};

/* ── Head rewriting ─────────────────────────────────────────────────── */

/**
 * Produce a route-specific document from the built shell. Every tag the
 * runtime `usePageMeta` would set is set here statically instead.
 */
function renderPage(shell, meta) {
  const { title, description, url, image, ogType = "website", jsonLd } = meta;
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const u = escapeHtml(url);
  const img = escapeHtml(image);

  let html = shell
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${t}</title>`)
    .replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${d}" />`)
    .replace(/<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${u}" />`)
    .replace(/<meta\s+property="og:type"[^>]*>/i, `<meta property="og:type" content="${ogType}" />`)
    .replace(/<meta\s+property="og:title"[^>]*>/i, `<meta property="og:title" content="${t}" />`)
    .replace(
      /<meta\s+property="og:description"[^>]*>/i,
      `<meta property="og:description" content="${d}" />`,
    )
    .replace(/<meta\s+property="og:url"[^>]*>/i, `<meta property="og:url" content="${u}" />`)
    .replace(/<meta\s+property="og:image"[^>]*>/i, `<meta property="og:image" content="${img}" />`)
    .replace(/<meta\s+name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${t}" />`)
    .replace(
      /<meta\s+name="twitter:description"[^>]*>/i,
      `<meta name="twitter:description" content="${d}" />`,
    )
    .replace(/<meta\s+name="twitter:image"[^>]*>/i, `<meta name="twitter:image" content="${img}" />`);

  // og:image:alt from the shell describes the sitewide default image only.
  if (image !== meta.defaultImage) {
    html = html.replace(/<meta\s+property="og:image:alt"[^>]*>\s*/i, "");
  }

  if (jsonLd) {
    html = html.replace(
      "</head>",
      `  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n  </head>`,
    );
  }
  return html;
}

function writePage(routePath, html) {
  const target = resolve(DIST, `.${trailing(routePath)}index.html`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html);
}

/* ── Main ───────────────────────────────────────────────────────────── */

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("[prerender-seo] Missing Supabase env — skipping prerender.");
    return;
  }
  const [siteRows, cmsPages, blogPosts] = await Promise.all([
    rest("site_content?select=section_key,content"),
    rest("cms_pages?status=eq.published&select=slug,title,meta_title,meta_description,og_image,updated_at"),
    rest(
      "blog_posts?status=eq.published&select=slug,title,excerpt,content,meta_title,meta_description,og_image,cover_image,author_name,published_at,updated_at&order=published_at.desc",
    ),
  ]);

  const section = (key) => siteRows.find((r) => r.section_key === key)?.content || {};
  const brand = section("brand_settings");
  const identity = brand.identity || {};
  const homeSeo = section("main_page_seo");
  const blogSeo = section("blog_page");

  const origin = String(identity.canonicalOrigin || "").trim().replace(/\/+$/, "");
  if (!origin) {
    throw new Error(
      "[prerender-seo] brand_settings.identity.canonicalOrigin is not set. Refusing to emit a sitemap/canonical set for an unknown domain.",
    );
  }
  const brandName = identity.brandName || "";
  const tagline = identity.tagline || "";
  const defaultSuffix = tagline && brandName ? `${brandName} — ${tagline}` : brandName;
  const defaultImage = `${origin}${DEFAULT_OG_IMAGE_PATH}`;

  const abs = (path) => `${origin}${path}`;
  const absImage = (v) =>
    !v ? defaultImage : /^https?:\/\//i.test(v) ? v : `${origin}${v.startsWith("/") ? "" : "/"}${v}`;
  const titleFor = (metaTitle, pageTitle) =>
    (metaTitle || "").trim() ||
    [pageTitle, defaultSuffix || brandName].filter(Boolean).join(" | ") ||
    brandName;

  /** Every route we emit: { path, meta, sitemap } */
  const routes = [];

  // Homepage
  routes.push({
    path: "/",
    meta: {
      title: titleFor(homeSeo.meta_title, brandName),
      description: homeSeo.meta_description || tagline,
      url: abs("/"),
      image: defaultImage,
    },
    sitemap: { changefreq: "weekly", priority: "1.0" },
  });

  // Blog index
  routes.push({
    path: "/blog/",
    meta: {
      title: titleFor(blogSeo.meta_title, blogSeo.header_title || "Blog"),
      description: blogSeo.meta_description || plain(blogSeo.header_subtitle),
      url: abs("/blog/"),
      image: defaultImage,
    },
    sitemap: { changefreq: "weekly", priority: "0.8" },
  });

  // CMS pages
  //
  // Every non-services CMS page is ALSO reachable at the bare /:slug
  // route (App.tsx mounts CmsPage there too, alongside /p/:slug) — same
  // content, same DB row, different URL. Without a prerendered file at
  // that path, a crawler hitting it directly gets the empty SPA shell
  // instead of real content. `fallbackRoutes` below writes that file,
  // but its <link rel="canonical"> still points at the /p/ version (via
  // `meta.url`, decoupled from the file's own path) and it's deliberately
  // NOT added to `routes` — the sitemap should only ever list the one
  // preferred URL per page, not the fallback duplicate.
  const fallbackRoutes = [];
  for (const page of cmsPages) {
    if (!page.slug) continue;
    const path = cmsPagePath(page.slug);
    const meta = {
      title: titleFor(page.meta_title, page.title),
      description: page.meta_description || "",
      url: abs(path),
      image: absImage(page.og_image),
    };
    routes.push({
      path,
      meta,
      sitemap: { lastmod: page.updated_at, changefreq: "monthly", priority: "0.7" },
    });
    if (path !== `/${trailing(page.slug)}`) {
      fallbackRoutes.push({ path: `/${trailing(page.slug)}`, meta });
    }
  }

  // Blog posts
  for (const post of blogPosts) {
    if (!post.slug) continue;
    const path = `/blog/${trailing(post.slug)}`;
    const description = post.meta_description || plain(post.excerpt) || plain(post.content);
    const image = absImage(post.og_image || post.cover_image);
    routes.push({
      path,
      meta: {
        title: titleFor(post.meta_title, post.title),
        description,
        url: abs(path),
        image,
        ogType: "article",
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description,
          image,
          url: abs(path),
          datePublished: post.published_at || undefined,
          dateModified: post.updated_at || post.published_at || undefined,
          ...(post.author_name ? { author: { "@type": "Person", name: post.author_name } } : {}),
          ...(brandName ? { publisher: { "@type": "Organization", name: brandName } } : {}),
        },
      },
      sitemap: {
        lastmod: post.published_at || post.updated_at,
        changefreq: "monthly",
        priority: "0.6",
      },
    });
  }

  if (routes.length > MAX_PRERENDER_PAGES) {
    console.warn(
      `[prerender-seo] ${routes.length} routes exceeds the ${MAX_PRERENDER_PAGES} cap — truncating.`,
    );
    routes.length = MAX_PRERENDER_PAGES;
  }

  // ── 1. sitemap.xml ─────────────────────────────────────────────────
  const urls = routes.map(({ path, sitemap }) => {
    const parts = [`    <loc>${escapeXml(abs(path))}</loc>`];
    if (sitemap.lastmod) {
      parts.push(`    <lastmod>${new Date(sitemap.lastmod).toISOString().split("T")[0]}</lastmod>`);
    }
    if (sitemap.changefreq) parts.push(`    <changefreq>${sitemap.changefreq}</changefreq>`);
    if (sitemap.priority) parts.push(`    <priority>${sitemap.priority}</priority>`);
    return `  <url>\n${parts.join("\n")}\n  </url>`;
  });
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;

  // Write to public/ so the file exists in source for dev previews and SEO scanners.
  writeFileSync(resolve("public", "sitemap.xml"), sitemapXml);
  // Write to dist/ after a build so the deployed site serves the authoritative version.
  if (existsSync(DIST)) writeFileSync(resolve(DIST, "sitemap.xml"), sitemapXml);

  // ── 2. llms.txt ────────────────────────────────────────────────────
  const lines = [`# ${brandName}`, ""];
  if (tagline) lines.push(`> ${tagline}`, "");
  if (homeSeo.meta_description) lines.push(homeSeo.meta_description, "");
  lines.push("## Pages", "");
  lines.push(`- [Home](${abs("/")}): ${homeSeo.meta_description || tagline}`);
  for (const page of cmsPages) {
    if (!page.slug) continue;
    lines.push(
      `- [${page.title}](${abs(cmsPagePath(page.slug))}): ${plain(page.meta_description) || page.title}`,
    );
  }
  lines.push("", "## Articles", "");
  for (const post of blogPosts.slice(0, 100)) {
    if (!post.slug) continue;
    lines.push(
      `- [${post.title}](${abs(`/blog/${trailing(post.slug)}`)}): ${plain(post.excerpt || post.meta_description || post.content, 160)}`,
    );
  }
  const llmsTxt = `${lines.join("\n")}\n`;
  writeFileSync(resolve("public", "llms.txt"), llmsTxt);
  if (existsSync(DIST)) writeFileSync(resolve(DIST, "llms.txt"), llmsTxt);

  // ── 3. Per-route HTML (only after vite build, when dist/index.html exists) ──
  const shellPath = resolve(DIST, "index.html");
  if (existsSync(shellPath)) {
    const shell = readFileSync(shellPath, "utf8");
    for (const route of routes) {
      writePage(route.path, renderPage(shell, { ...route.meta, defaultImage }));
    }
    // Bare-slug fallback files — real content for crawlers, canonical
    // tag still points at the preferred /p/ URL (see fallbackRoutes note
    // above). Not counted in the "wrote N pages" total below since they
    // aren't a distinct indexable page, just a non-canonical mirror.
    for (const route of fallbackRoutes) {
      writePage(route.path, renderPage(shell, { ...route.meta, defaultImage }));
    }
  }

  console.log(
    `[prerender-seo] wrote ${routes.length} pages (+${fallbackRoutes.length} bare-slug fallback mirrors), sitemap.xml (${routes.length} urls) and llms.txt for ${origin}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
