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
import {
  WORK_SELECT,
  workIndexDescription,
  workItemArticleLd,
  workItemMeta,
  workLlmsLines,
} from "./lib/workSeo.mjs";
import { htmlToBlocks, linkListHtml, readableMain, rowsHeading, rowsToHtml } from "./lib/readableHtml.mjs";
import { buildPageTitle } from "./lib/seoTitle.mjs";
/** The public booking page (ContactRow DEFAULT_BOOKING_URL). */
const BOOKING_URL = "https://calendar.app.google/rCZX6w2RUWKpsKfRA";
import { buildEntityGraph, founderId, orgId, FOUNDER_NAME, COMPANY_DEFINITION } from "./lib/entityGraph.mjs";

/** /work/ when its search title is empty (US08); the brand is added once. */
const WORK_FALLBACK_TITLE = "Work: case studies and playbooks";

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

/* ── Row content walking (v1 / v2 / v3 shapes) ──────────────────────── */

/**
 * Flatten a page's `page_rows` into widgets, whichever of the three
 * historical shapes they were saved in:
 *   v1 the row IS the widget · v2 row.columns[].widgets[] ·
 *   v3 row.columns[].cells[].widgets[]  (canonical)
 * Mirrors `normalizeRowsToV3` / `flattenWidgets` on the client — kept in
 * plain JS here because this script runs under bare node at postbuild.
 */
function flattenWidgets(rows) {
  const out = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row !== "object") continue;
    if (row.type) out.push({ type: row.type, data: row.data || row.content || {} }); // v1
    for (const column of row.columns || []) {
      for (const widget of column.widgets || []) {
        out.push({ type: widget.type, data: widget.data || widget.content || {} }); // v2
      }
      for (const cell of column.cells || []) {
        for (const widget of cell.widgets || []) {
          out.push({ type: widget.type, data: widget.data || widget.content || {} }); // v3
        }
      }
    }
  }
  return out;
}

/** Question/answer pairs from every FAQ widget, in document order. */
function extractFaqItems(rows) {
  const items = [];
  for (const widget of flattenWidgets(rows)) {
    if (widget.type !== "faq") continue;
    for (const raw of Array.isArray(widget.data?.items) ? widget.data.items : []) {
      const question = plain(raw?.question, 300);
      const answer = plain(raw?.answer, 1200);
      if (question && answer) items.push({ question, answer });
    }
  }
  return items;
}

/** The page's headline + a few paragraphs of real copy, for crawlers. */
function extractReadableContent(rows) {
  const widgets = flattenWidgets(rows);
  let heading = "";
  const paragraphs = [];
  for (const { type, data } of widgets) {
    if (!data || typeof data !== "object") continue;
    const lines = Array.isArray(data.title_lines) ? data.title_lines.map((l) => plain(l, 120)) : [];
    const title = plain(data.title || data.heading, 160) || lines.filter(Boolean).join(" ");
    if (!heading && title) heading = title;
    else if (title && type !== "hero") paragraphs.push(title);
    for (const key of ["subtitle", "body", "intro", "text", "description"]) {
      const value = plain(data[key], 400);
      if (value) paragraphs.push(value);
    }
  }
  return { heading, paragraphs: paragraphs.slice(0, 12) };
}

/* ── Head rewriting ─────────────────────────────────────────────────── */

/**
 * Produce a route-specific document from the built shell. Every tag the
 * runtime `usePageMeta` would set is set here statically instead.
 */
function renderPage(shell, meta) {
  const { title, description, url, image, ogType = "website", jsonLd, readable } = meta;
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

  // JSON-LD: one object or several (Organization + Person + FAQPage…).
  const blocks = (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).filter(Boolean);
  if (blocks.length) {
    html = html.replace(
      "</head>",
      `${blocks
        .map((b) => `  <script type="application/ld+json" data-prerender="1">${JSON.stringify(b).replace(/</g, "\\u003c")}</script>`)
        .join("\n")}\n  </head>`,
    );
  }

  // Real copy for crawlers that never run the app. Sits in <noscript> so
  // it never conflicts with React taking over #root for real visitors.
  // `readable` is the whole page text, already made safe by readableHtml.mjs (US02).
  if (readable) {
    html = html.replace(
      /<\/body>/i,
      () => `  <noscript>\n    <main>\n${readable}\n    </main>\n  </noscript>\n  </body>`,
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
  const [siteRows, cmsPages, blogPosts, workItems] = await Promise.all([
    rest("site_content?select=section_key,content,updated_at"),
    rest(
      "cms_pages?status=eq.published&select=slug,title,meta_title,meta_description,og_image,page_rows,updated_at",
    ),
    rest(
      "blog_posts?status=eq.published&select=slug,title,excerpt,content,meta_title,meta_description,og_image,cover_image,author_name,published_at,updated_at&order=published_at.desc",
    ),
    rest(
      `work_items?status=eq.published&select=${WORK_SELECT}&order=sort_order.asc`,
    ),
  ]);


  const section = (key) => siteRows.find((r) => r.section_key === key)?.content || {};
  const sectionUpdatedAt = (key) => siteRows.find((r) => r.section_key === key)?.updated_at;
  const brand = section("brand_settings");
  const identity = brand.identity || {};
  const homeSeo = section("main_page_seo");
  const blogSeo = section("blog_page");
  // The /work index's own search fields and plain answer (Admin, Pages, Work).
  const workPage = section("work_page");
  /* The author block is set once on the admin's Profile screen
     (site content "author_profile"); a post's own author_name is the
     fallback for anything written before that move. Mirrors
     `resolveAuthor` in src/features/site/authorProfile.ts. */
  const authorProfile = section("author_profile");
  const authorNameFor = (post) => (authorProfile.name || "").trim() || (post.author_name || "").trim();
  const serviceAreas = (section("global_seo_tags").organization?.service_areas || [])
    .map((s) => String(s).trim())
    .filter(Boolean);

  /** Most recent published post's timestamp — the blog index's real
   *  content is "the list of posts", so a new post is what actually
   *  changes that page, not edits to the `blog_page` header row. */
  const latestPostTimestamp = blogPosts.reduce((latest, post) => {
    const t = post.updated_at || post.published_at;
    return t && (!latest || new Date(t) > new Date(latest)) ? t : latest;
  }, undefined);

  const origin = String(identity.canonicalOrigin || "").trim().replace(/\/+$/, "");
  if (!origin) {
    throw new Error(
      "[prerender-seo] brand_settings.identity.canonicalOrigin is not set. Refusing to emit a sitemap/canonical set for an unknown domain.",
    );
  }
  const brandName = identity.brandName || "";
  const tagline = identity.tagline || "";
  const defaultImage = `${origin}${DEFAULT_OG_IMAGE_PATH}`;

  const abs = (path) => `${origin}${path}`;
  const absImage = (v) =>
    !v ? defaultImage : /^https?:\/\//i.test(v) ? v : `${origin}${v.startsWith("/") ? "" : "/"}${v}`;
  // Same builder as the browser head (usePageMeta), so the two agree.
  const titleFor = (metaTitle, pageTitle) => buildPageTitle({ searchTitle: metaTitle, pageTitle, brand: brandName });

  /* ── Sitewide entities ───────────────────────────────────────────── */

  /* One graph for the company, the site and the founder (US05), on every
     page; everything else points at it by @id. The founder's name, photo
     and LinkedIn come from the admin's Profile screen. */
  const aboutPage = cmsPages.find((p) => p.slug === "about-us");
  const social = section("social_links");
  const entityGraph = buildEntityGraph({
    origin,
    brandName,
    description: COMPANY_DEFINITION,
    logo: section("branding").logo_url,
    sameAs: [social.linkedin, social.instagram, social.youtube, social.tiktok],
    bookingUrl: BOOKING_URL,
    aboutPath: aboutPage ? cmsPagePath(aboutPage.slug) : "",
    founder: { name: authorProfile.name, photo: authorProfile.photo, linkedin: authorProfile.linkedin },
  });
  const founderName = (authorProfile.name || "").trim() || FOUNDER_NAME;
  /** The founder as Work items reference him (by @id). */
  const personLd = {
    "@id": founderId(origin),
    name: founderName,
    url: aboutPage ? abs(cmsPagePath(aboutPage.slug)) : abs("/"),
  };
  /** A post's author: the founder by @id, or a named person for older posts by someone else. */
  const authorFor = (post) => {
    const name = authorNameFor(post);
    if (!name) return null;
    return name === founderName ? { "@type": "Person", "@id": founderId(origin), name } : { "@type": "Person", name };
  };

  /** BreadcrumbList from a list of [name, url] pairs. */
  const breadcrumbLd = (crumbs) => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map(([name, url], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: url,
    })),
  });

  /** FAQPage from a page's rows, or null when the page has no FAQ. */
  const faqLd = (rows) => {
    const items = extractFaqItems(rows);
    if (!items.length) return null;
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: items.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    };
  };

  /** Every route we emit: { path, meta, sitemap } */
  const routes = [];

  // Homepage — its rows live in the site_content `page_rows` row.
  const homeRows = section("page_rows").rows || [];
  routes.push({
    path: "/",
    meta: {
      title: titleFor(homeSeo.meta_title, brandName),
      description: homeSeo.meta_description || tagline,
      url: abs("/"),
      image: defaultImage,
      jsonLd: [faqLd(homeRows)].filter(Boolean),
      readable: readableMain(rowsHeading(homeRows) || brandName, [rowsToHtml(homeRows)]),
    },
    sitemap: { lastmod: sectionUpdatedAt("main_page_seo"), changefreq: "weekly", priority: "1.0" },
  });

  // Blog index
  routes.push({
    path: "/blog/",
    meta: {
      title: titleFor(blogSeo.meta_title, blogSeo.header_title || "Blog"),
      description: blogSeo.meta_description || plain(blogSeo.header_subtitle),
      url: abs("/blog/"),
      image: defaultImage,
      jsonLd: breadcrumbLd([
        ["Home", `${origin}/`],
        [blogSeo.header_title || "Blog", abs("/blog/")],
      ]),
      // US06: the header, the intro and every post with its one-line summary.
      readable: readableMain(blogSeo.header_title || "Blog", [
        htmlToBlocks(blogSeo.header_subtitle),
        linkListHtml(
          blogPosts.map((post) => ({
            href: `/blog/${trailing(post.slug || "")}`,
            title: post.title,
            summary: plain(post.excerpt || post.meta_description, 240),
          })),
        ),
      ]),
    },
    sitemap: { lastmod: latestPostTimestamp, changefreq: "weekly", priority: "0.8" },
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
    const rows = Array.isArray(page.page_rows) ? page.page_rows : [];
    // The hero's plain answer doubles as the search description when the
    // page has none of its own — mirrors the runtime fallback in
    // CmsPage.tsx so crawlers and visitors see the same description.
    const heroAnswer =
      plain(flattenWidgets(rows).find((w) => w.type === "hero")?.data?.answer, 300) || "";
    const description = page.meta_description || heroAnswer;
    // Individual service pages (not the /services/ index itself) get a
    // Service schema block — mirrors the client-side version usePageMeta
    // emits in CmsPage.tsx, so bots and real users see the same markup.
    // Deliberately carries only fields we know are true (no fabricated
    // address, phone or price).
    const isServicePage = page.slug === "services" ? false : page.slug.startsWith("services/");

    // Breadcrumbs mirror the visible trail: Home › Services › Page.
    const crumbs = [["Home", `${origin}/`]];
    if (isServicePage) crumbs.push(["Services", abs("/services/")]);
    crumbs.push([page.title, abs(path)]);

    const meta = {
      title: titleFor(page.meta_title, page.title),
      description,
      url: abs(path),
      image: absImage(page.og_image),
      readable: readableMain(rowsHeading(rows) || page.title, [rowsToHtml(rows)]),
      jsonLd: [
        isServicePage
          ? {
              "@context": "https://schema.org",
              "@type": "Service",
              name: page.title,
              // Runtime (CmsPage.tsx) prefers the plain answer for the
              // Service schema; keep the two in lock-step.
              ...((heroAnswer || description) ? { description: heroAnswer || description } : {}),
              url: abs(path),
              provider: { "@id": orgId(origin) },
              ...(serviceAreas.length
                ? { areaServed: serviceAreas.map((name) => ({ "@type": "Place", name })) }
                : {}),
            }
          : null,
        faqLd(rows),
        breadcrumbLd(crumbs),
      ].filter(Boolean),
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
        jsonLd: [
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description,
            image,
            url: abs(path),
            datePublished: post.published_at || undefined,
            dateModified: post.updated_at || post.published_at || undefined,
            ...(authorFor(post) ? { author: authorFor(post) } : {}),
            ...(brandName ? { publisher: { "@id": orgId(origin) } } : {}),
          },
          breadcrumbLd([
            ["Home", `${origin}/`],
            [blogSeo.header_title || "Blog", abs("/blog/")],
            [post.title, abs(path)],
          ]),
        ],
        // The whole article, not a cut (US02).
        readable: readableMain(post.title, [htmlToBlocks(post.excerpt), htmlToBlocks(post.content)]),
      },

      sitemap: {
        // Real last-modified date: an edited post must report the edit,
        // not its original publication date.
        lastmod: post.updated_at || post.published_at,
        changefreq: "monthly",
        priority: "0.6",
      },

    });
  }

  // Work (portfolio) — index + one route per published case study.
  if (Array.isArray(workItems) && workItems.length > 0) {
    const latestWorkTimestamp = workItems.reduce((latest, item) => {
      const t = item.updated_at || "";
      return t > latest ? t : latest;
    }, "");
    routes.push({
      path: "/work/",
      meta: {
        title: titleFor(workPage.meta_title, WORK_FALLBACK_TITLE),
        description: plain(workPage.meta_description, 300) || plain(workPage.answer, 300) || workIndexDescription(workItems, brandName),
        url: abs("/work/"),
        image: defaultImage,
        jsonLd: [
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Work",
            url: abs("/work/"),
            description: workIndexDescription(workItems, brandName),
            hasPart: workItems.map((item) => ({
              "@type": "Article",
              headline: item.title,
              description: workItemMeta(item).description,
              url: abs(`/work/${trailing(item.slug)}`),
            })),
          },
          breadcrumbLd([
            ["Home", `${origin}/`],
            ["Work", abs("/work/")],
          ]),
        ],
        // US06: the header, the plain answer and every piece with its one-liner.
        readable: readableMain(workPage.header_title || "Work", [
          htmlToBlocks(workPage.header_subtitle),
          htmlToBlocks(workPage.answer),
          rowsToHtml(workPage.rows_above),
          linkListHtml(
            workItems.map((item) => ({
              href: `/work/${trailing(item.slug || "")}`,
              title: item.title,
              summary: plain(item.summary, 240),
            })),
          ),
          rowsToHtml(workPage.rows_below),
        ]),
      },
      sitemap: { lastmod: latestWorkTimestamp, changefreq: "weekly", priority: "0.8" },
    });

    for (const item of workItems) {
      if (!item.slug) continue;
      const path = `/work/${trailing(item.slug)}`;
      const rows = Array.isArray(item.case_rows) ? item.case_rows : [];
      const meta = workItemMeta(item);
      const description = meta.description || plain(extractReadableContent(rows)?.paragraphs?.[0]);
      routes.push({
        path,
        meta: {
          title: titleFor(item.meta_title, item.title),
          description,
          url: abs(path),
          image: absImage(meta.image),
          ogType: "article",
          jsonLd: [
            workItemArticleLd(item, { abs, absImage, path, brandName, origin, person: personLd }),
            // Questions answered on the page become FAQPage data for answer engines.
            faqLd(rows),
            breadcrumbLd([
              ["Home", `${origin}/`],
              ["Work", abs("/work/")],
              [item.title, abs(path)],
            ]),
          ].filter(Boolean),
          readable: readableMain(item.title, [htmlToBlocks(item.summary), rowsToHtml(rows)]),
        },
        sitemap: { lastmod: item.updated_at, changefreq: "monthly", priority: "0.6" },
      });
    }
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
    if (sitemap.changefreq) parts.push(`    <changefreq>${escapeXml(String(sitemap.changefreq))}</changefreq>`);
    if (sitemap.priority) parts.push(`    <priority>${escapeXml(String(sitemap.priority))}</priority>`);
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
  if (workItems.length) {
    // Work pieces, with their plain-facts summary, so AI answers can cite them.
    lines.push("", "## Work", "", ...workLlmsLines(workItems, abs));
  }
  const llmsTxt = `${lines.join("\n")}\n`;
  writeFileSync(resolve("public", "llms.txt"), llmsTxt);
  if (existsSync(DIST)) writeFileSync(resolve(DIST, "llms.txt"), llmsTxt);

  // ── 3. Per-route HTML (only after vite build, when dist/index.html exists) ──
  const shellPath = resolve(DIST, "index.html");
  if (existsSync(shellPath)) {
    const shell = readFileSync(shellPath, "utf8");
    // The entity graph leads every page's structured data (US05).
    const withGraph = (meta) => ({
      ...meta,
      defaultImage,
      jsonLd: [entityGraph, ...(Array.isArray(meta.jsonLd) ? meta.jsonLd : [meta.jsonLd])].filter(Boolean),
    });
    for (const route of routes) {
      writePage(route.path, renderPage(shell, withGraph(route.meta)));
    }
    // Bare-slug fallback files — real content for crawlers, canonical
    // tag still points at the preferred /p/ URL (see fallbackRoutes note
    // above). Not counted in the "wrote N pages" total below since they
    // aren't a distinct indexable page, just a non-canonical mirror.
    for (const route of fallbackRoutes) {
      writePage(route.path, renderPage(shell, withGraph(route.meta)));
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
