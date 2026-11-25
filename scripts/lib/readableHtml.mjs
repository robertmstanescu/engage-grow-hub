/**
 * The full page text as plain, safe HTML for the server copy of each page
 * (US02, US06). Crawlers and AI fetchers that never run the app read this
 * from the prerendered file's <noscript><main>.
 *
 * Pure functions, shared by scripts/prerender-seo.mjs (bare node at
 * postbuild) and its unit test (src/lib/seo/readableHtml.test.ts).
 *
 * What it keeps: headings, paragraphs, lists, Q&A, cards, prices, quotes,
 * captions and links whose target is a site path or an https address.
 * What it drops: every attribute but a safe href, inline styling, images,
 * scripts, colours, layout and ids. Everything it prints is escaped.
 */

import { withTrailingSlash } from "./sitePath.mjs";

/** Escape text for an HTML text node or a double-quoted attribute. */
export const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };

/** Turn the entities a rich-text editor writes back into characters. */
export function decodeEntities(s) {
  return String(s ?? "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return NAMED[code.toLowerCase()] ?? m;
  });
}

/** A link target a crawler may follow: a site path, an https address or mail. */
export function safeHref(href) {
  const h = decodeEntities(String(href ?? "")).trim();
  if (!h) return "";
  if (h.startsWith("/") && !h.startsWith("//")) return withTrailingSlash(h);
  if (/^https:\/\/[^\s"'<>]+$/i.test(h)) return h;
  if (/^mailto:[^\s"'<>]+$/i.test(h)) return h;
  return "";
}

const squash = (s) => s.replace(/\s+/g, " ");

const BLOCK = { h1: "h2", h2: "h2", h3: "h3", h4: "h3", h5: "h3", h6: "h3", p: "p", div: "p", blockquote: "p", figcaption: "p", li: "li", dt: "p", dd: "p", td: "p", th: "p", section: "p", article: "p" };

/**
 * Rich text to safe HTML: h2/h3, p, ul/li and links only. Every other tag
 * is dropped but its text is kept; script and style bodies go entirely.
 * `level` shifts headings down so a body's h2 sits under the row's h2.
 */
export function htmlToBlocks(input, { level = 0 } = {}) {
  const src = String(input ?? "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|template|noscript|svg|iframe)\b[\s\S]*?<\/\1\s*>/gi, " ");
  const out = [];
  let block = ""; // the open block tag, or ""
  let text = ""; // escaped content of the open block
  let inList = false;
  let link = null; // { href, text } while inside a kept <a>

  const flush = () => {
    const body = squash(text).trim();
    if (block && body) {
      if (block === "li") {
        if (!inList) out.push("<ul>");
        inList = true;
        out.push(`<li>${body}</li>`);
      } else {
        if (inList) out.push("</ul>");
        inList = false;
        out.push(`<${block}>${body}</${block}>`);
      }
    }
    block = "";
    text = "";
  };
  const open = (tag) => {
    flush();
    let t = tag;
    if (level && (t === "h2" || t === "h3")) t = "h3";
    block = t;
  };
  const write = (escaped) => {
    if (!escaped.trim() && !text) return;
    if (!block) block = "p";
    text += escaped;
  };

  const re = /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)([^>]*)>|([^<]+)|(<)/g;
  let m;
  while ((m = re.exec(src))) {
    const [, closing, rawTag, attrs, chunk, stray] = m;
    if (chunk !== undefined || stray !== undefined) {
      const raw = decodeEntities(chunk ?? stray);
      if (link) link.text += raw;
      else write(escapeHtml(squash(raw)));
      continue;
    }
    const tag = rawTag.toLowerCase();
    if (tag === "a") {
      if (!closing) {
        const hm = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs || "");
        const href = safeHref(hm ? hm[1] ?? hm[2] ?? hm[3] : "");
        link = { href, text: "" };
      } else if (link) {
        const label = squash(link.text).trim();
        if (label) write(link.href ? `<a href="${escapeHtml(link.href)}">${escapeHtml(label)}</a>` : escapeHtml(label));
        link = null;
      }
      continue;
    }
    if (tag === "br") {
      write(" ");
      continue;
    }
    if (tag === "ul" || tag === "ol") {
      flush();
      if (closing && inList) {
        out.push("</ul>");
        inList = false;
      }
      continue;
    }
    const mapped = BLOCK[tag];
    if (!mapped) {
      // Inline formatting: keep a word gap where the tag sat between words.
      continue;
    }
    if (closing) flush();
    else open(mapped);
  }
  if (link) write(escapeHtml(squash(link.text)));
  flush();
  if (inList) out.push("</ul>");
  return out.join("\n");
}

/** Plain one-line text from a value that may hold HTML. */
export function plainText(v) {
  return squash(decodeEntities(String(v ?? "").replace(/<[^>]+>/g, " "))).trim();
}

/* ── Rows ─────────────────────────────────────────────────────────── */

/** v1 row = widget · v2 row.columns[].widgets[] · v3 row.columns[].cells[].widgets[]. */
export function flattenWidgets(rows) {
  const out = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row !== "object") continue;
    if (row.type) out.push({ type: row.type, data: row.data || row.content || {} });
    for (const column of row.columns || []) {
      for (const widget of column?.widgets || []) out.push({ type: widget?.type, data: widget?.data || widget?.content || {} });
      for (const cell of column?.cells || []) {
        for (const widget of cell?.widgets || []) out.push({ type: widget?.type, data: widget?.data || widget?.content || {} });
      }
    }
  }
  return out;
}

/** Keys whose value is a heading for the widget or the item. */
const HEADING_KEYS = ["title_lines", "title", "heading", "title_line1", "question", "name"];
/** Small text printed above a heading. */
const KICKER_KEYS = ["eyebrow", "tag", "stamp", "pillar_number", "group_label"];
/** Visible copy, in reading order. */
const TEXT_KEYS = [
  "title_line2",
  "title_accent",
  "subtitle",
  "tagline",
  "lede",
  "intro",
  "role",
  "time",
  "meta",
  "price",
  "price_note",
  "value",
  "label",
  "body",
  "folded_body",
  "body_after",
  "text",
  "content",
  "description",
  "answer",
  "quote",
  "caption",
  "floating_caption",
  "visual_badge_title",
  "visual_badge_label",
  "visual_badge_text",
  "note",
  "legend_note",
  "startHere",
];
/** Lists of items. `fields` (an old contact form) and colours are left out on purpose. */
const LIST_KEYS = ["items", "cards", "steps", "services", "tiers", "plans", "categories", "deliverables", "credentials", "points", "stats", "worked", "hr", "main", "faqs", "rows", "features", "includes"];
/** Label + target pairs that render as links. */
const LINK_PAIRS = [
  ["cta_label", "cta_url"],
  ["button_text", "button_url"],
  ["link_label", "link_url"],
  ["link_text", "link_url"],
  ["secondary_cta_label", "secondary_cta_url"],
];

const isRich = (s) => /<\s*(p|h[1-6]|ul|ol|li|div|br|blockquote|a)\b/i.test(s);

/** One text value as blocks: rich text keeps its structure, plain text is a paragraph. */
function textBlock(value) {
  if (typeof value !== "string") {
    if (typeof value === "number") return `<p>${value}</p>`;
    return "";
  }
  if (isRich(value)) return htmlToBlocks(value, { level: 1 });
  const t = plainText(value);
  return t ? `<p>${escapeHtml(t)}</p>` : "";
}

function headingOf(data) {
  for (const key of HEADING_KEYS) {
    const v = data[key];
    if (Array.isArray(v)) {
      const t = v.map(plainText).filter(Boolean).join(" ");
      if (t) return { key, text: t };
    } else if (typeof v === "string" && plainText(v)) {
      return { key, text: plainText(v) };
    }
  }
  return null;
}

function linksOf(data) {
  const out = [];
  for (const [labelKey, urlKey] of LINK_PAIRS) {
    const label = plainText(data[labelKey]);
    const href = safeHref(data[urlKey]);
    if (label && href) out.push(`<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`);
  }
  return out.length ? `<p>${out.join(" · ")}</p>` : "";
}

/**
 * One object (a widget's data or one item of a list) as blocks.
 * depth 0 → h2, deeper → h3. Recurses into lists up to three levels.
 */
function objectHtml(data, depth = 0) {
  if (!data || typeof data !== "object") return "";
  if (depth > 3) return "";
  const parts = [];
  const tag = depth === 0 ? "h2" : "h3";
  const kicker = KICKER_KEYS.map((k) => plainText(data[k])).filter(Boolean);
  const head = headingOf(data);
  if (kicker.length) parts.push(`<p>${escapeHtml(kicker.join(" · "))}</p>`);
  if (head) parts.push(`<${tag}>${escapeHtml(head.text)}</${tag}>`);
  // A name that is not the heading (a quote's speaker) still prints.
  if (head && head.key !== "name" && plainText(data.name)) parts.push(`<p>${escapeHtml(plainText(data.name))}</p>`);
  for (const key of TEXT_KEYS) parts.push(textBlock(data[key]));
  for (const key of LIST_KEYS) {
    const list = data[key];
    if (!Array.isArray(list) || !list.length) continue;
    if (list.every((x) => typeof x === "string")) {
      const lis = list.map(plainText).filter(Boolean).map((t) => `<li>${escapeHtml(t)}</li>`);
      if (lis.length) parts.push(`<ul>\n${lis.join("\n")}\n</ul>`);
    } else {
      for (const item of list) {
        if (typeof item === "string") parts.push(textBlock(item));
        else parts.push(objectHtml(item, depth + 1));
      }
    }
  }
  parts.push(linksOf(data));
  return parts.filter(Boolean).join("\n");
}

/** Row types that carry no copy of their own. */
const SKIP_TYPES = new Set(["spacer", "divider", "embed", "video", "article"]);

/** Every widget of a page, in reading order, as safe HTML. */
export function rowsToHtml(rows) {
  return flattenWidgets(rows)
    .filter((w) => w && w.type && !SKIP_TYPES.has(w.type))
    // The recent-posts row's button always goes to the blog index.
    .map((w) => objectHtml(w.type === "from_the_blog" && w.data && !w.data.link_url ? { ...w.data, link_url: "/blog/" } : w.data, 0))
    .filter(Boolean)
    .join("\n");
}

/** The first heading the rows print, for the page's h1. */
export function rowsHeading(rows) {
  for (const w of flattenWidgets(rows)) {
    const h = w?.data && typeof w.data === "object" ? headingOf(w.data) : null;
    if (h && h.key !== "question" && h.key !== "name") return h.text;
  }
  return "";
}

/**
 * A linked list of pages for an index route: [{ href, title, summary }].
 * Each entry is a link with its one-line summary.
 */
export function linkListHtml(entries) {
  const lis = [];
  for (const e of entries || []) {
    const href = safeHref(e?.href);
    const title = plainText(e?.title);
    if (!href || !title) continue;
    const summary = plainText(e?.summary);
    lis.push(`<li><a href="${escapeHtml(href)}">${escapeHtml(title)}</a>${summary ? `: ${escapeHtml(summary)}` : ""}</li>`);
  }
  return lis.length ? `<ul>\n${lis.join("\n")}\n</ul>` : "";
}

/**
 * The whole server copy: an h1 and the blocks under it.
 * `parts` are HTML strings already made safe by the functions above.
 */
export function readableMain(heading, parts) {
  const body = (parts || []).filter((p) => typeof p === "string" && p.trim());
  const h1 = plainText(heading);
  if (!h1 && !body.length) return "";
  // Drop a leading h2 that repeats the h1.
  if (h1 && body.length) body[0] = body[0].replace(new RegExp(`^<h2>${escapeRegExp(escapeHtml(h1))}</h2>\\n?`), "");
  return [h1 ? `<h1>${escapeHtml(h1)}</h1>` : "", ...body].filter(Boolean).join("\n");
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
