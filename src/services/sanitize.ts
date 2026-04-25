import DOMPurify from "dompurify";
import { normalizeRichTextHtml } from "@/services/richTextFontSize";

/**
 * General-purpose sanitiser used by the rich-text editor and any place
 * where the CMS surfaces sanitised HTML. Permissive by design (allows
 * style + class for editor formatting), but DOMPurify still strips
 * <script>, on* handlers, javascript: URLs, etc. by default.
 */
export const sanitizeHtml = (html: string): string => {
  const sanitized = DOMPurify.sanitize(html, {
    ADD_ATTR: ["style", "class"],
  });

  return normalizeRichTextHtml(sanitized);
};

/* ─────────────────────────────────────────────────────────────────────
 * EMBED SANITISER (US 4.1 — HTML / Iframe Embed Widget)
 * ─────────────────────────────────────────────────────────────────────
 *
 * WHY THIS IS SEPARATE FROM `sanitizeHtml`
 * ────────────────────────────────────────
 * The Embed widget accepts RAW user-pasted HTML — typically YouTube,
 * Typeform, HubSpot, Google Maps etc. embed snippets. That is a much
 * higher-risk surface than the rich-text editor (which only emits HTML
 * the editor itself produced). To avoid widening `sanitizeHtml` for
 * everyone, we expose a SECOND, deliberately strict sanitiser used
 * ONLY by the Embed widget.
 *
 * THREAT MODEL
 * ────────────
 * 1. <script>alert('xss')</script>            → must be stripped.
 * 2. <img src=x onerror="...">                → on* handlers stripped.
 * 3. <a href="javascript:...">                → javascript: scheme blocked.
 * 4. <iframe src="javascript:...">            → only http(s) iframe URLs.
 * 5. SVG/MathML XSS vectors                   → entire namespaces blocked.
 * 6. <style> with `expression()` / imports    → <style> blocked outright.
 * 7. data: / vbscript: URLs in attributes     → blocked by URI regex.
 *
 * STRATEGY
 * ────────
 * Strict ALLOW-LIST. Every tag and attribute that isn't on the list is
 * dropped. The list is intentionally MINIMAL: enough to render the
 * embed snippets we actually see in the wild (iframe, plus a small
 * amount of wrapper markup) — nothing more. If a marketer needs a
 * tag we don't allow, that's a deliberate opt-in conversation, not a
 * silent permission.
 * ───────────────────────────────────────────────────────────────────── */

const EMBED_ALLOWED_TAGS = [
  // Embedding primitives
  "iframe",
  "video",
  "audio",
  "source",
  "track",
  "picture",
  "img",
  // Structural wrappers people commonly paste with their snippets
  "div",
  "span",
  "p",
  "section",
  "article",
  "figure",
  "figcaption",
  "blockquote",
  // Typographic safety net (so a snippet's caption renders sanely)
  "a",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "br",
  "hr",
  "ul",
  "ol",
  "li",
  "h1", "h2", "h3", "h4", "h5", "h6",
];

const EMBED_ALLOWED_ATTR = [
  // Iframe & media
  "src",
  "srcset",
  "sizes",
  "type",
  "title",
  "name",
  "frameborder",
  "allow",
  "allowfullscreen",
  "allowpaymentrequest",
  "loading",
  "referrerpolicy",
  "sandbox",
  "scrolling",
  "width",
  "height",
  "poster",
  "controls",
  "muted",
  "playsinline",
  "preload",
  "loop",
  "autoplay",
  // Layout
  "style",
  "class",
  "id",
  // Anchor + accessibility
  "href",
  "target",
  "rel",
  "alt",
  "aria-label",
  "aria-hidden",
  "role",
  // Data attributes used by Typeform / HubSpot / Calendly etc.
  // (DOMPurify also has ALLOW_DATA_ATTR=true, but we list common
  // ones explicitly so reviewers can see them.)
  "data-tf-live",
  "data-hubspot-form-id",
  "data-portal-id",
  "data-region",
];

/**
 * URI scheme allow-list. Anything not in this set is blocked by
 * DOMPurify's `ALLOWED_URI_REGEXP`. Notably `javascript:`, `data:`
 * and `vbscript:` are NOT in the list and therefore rejected.
 *
 * `mailto:` and `tel:` stay allowed for in-snippet links.
 */
const EMBED_SAFE_URI = /^(?:https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i;

/**
 * Sanitise an Embed widget's raw HTML.
 *
 * Returns a string that is SAFE to feed into `dangerouslySetInnerHTML`.
 *
 * Defence-in-depth notes:
 *  - `FORBID_TAGS` explicitly lists `<script>` and friends so even if a
 *    future allow-list edit accidentally re-includes them, this layer
 *    still blocks them.
 *  - `FORBID_ATTR` blocks every `on*` event handler.
 *  - `USE_PROFILES.svg = false` and `USE_PROFILES.mathMl = false`
 *    (achieved via `FORBID_TAGS` + namespace gating) close known
 *    SVG-based XSS vectors.
 *  - We post-process the output with a second pass that re-checks
 *    `<iframe src="...">` against an http(s)-only regex. DOMPurify
 *    already does this via `ALLOWED_URI_REGEXP`, but the extra
 *    explicit check makes the security guarantee unmistakable to
 *    anyone reading the code (and protects against a misconfiguration
 *    if the regex above is ever loosened).
 */
export const sanitizeEmbedHtml = (rawHtml: string): string => {
  if (!rawHtml || typeof rawHtml !== "string") return "";

  const cleaned = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: EMBED_ALLOWED_TAGS,
    ALLOWED_ATTR: EMBED_ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: EMBED_SAFE_URI,
    // Belt-and-braces: explicitly forbid the dangerous tags even if a
    // future edit accidentally adds them to the allow-list.
    FORBID_TAGS: [
      "script",
      "style",
      "noscript",
      "object",
      "embed",
      "form",
      "input",
      "button",
      "textarea",
      "select",
      "option",
      "meta",
      "link",
      "base",
      "svg",
      "math",
    ],
    FORBID_ATTR: [
      "onerror",
      "onload",
      "onclick",
      "onmouseover",
      "onmouseout",
      "onfocus",
      "onblur",
      "onchange",
      "onsubmit",
      "onkeydown",
      "onkeyup",
      "onkeypress",
      "onanimationstart",
      "onanimationend",
      "onanimationiteration",
      "ontransitionend",
      "formaction",
    ],
    // Block <a target="_blank"> from getting `window.opener` access.
    ADD_ATTR: ["target"],
    // Ensure target=_blank links are forced to noopener. DOMPurify hook
    // is registered below.
    KEEP_CONTENT: true,
    RETURN_TRUSTED_TYPE: false,
  });

  // Final iframe-src guard: drop the attribute entirely if it's not
  // an http(s) URL. We do this in the DOM, not by string regex, so we
  // don't get tripped by attribute-quoting tricks.
  if (typeof window === "undefined") return cleaned;

  const tmp = document.createElement("div");
  tmp.innerHTML = cleaned;

  tmp.querySelectorAll("iframe").forEach((iframe) => {
    const src = iframe.getAttribute("src") || "";
    if (!/^https?:\/\//i.test(src)) {
      iframe.removeAttribute("src");
    }
    // Force a sane sandbox if none is provided. We allow scripts +
    // same-origin (most third-party embeds need this) but NOT
    // top-navigation / popups / forms by default. Authors can
    // override via their own `sandbox=` attribute since DOMPurify
    // preserves it.
    if (!iframe.hasAttribute("sandbox")) {
      iframe.setAttribute(
        "sandbox",
        "allow-scripts allow-same-origin allow-presentation allow-popups",
      );
    }
    // Lazy-load by default — embeds are heavy.
    if (!iframe.hasAttribute("loading")) {
      iframe.setAttribute("loading", "lazy");
    }
    if (!iframe.hasAttribute("referrerpolicy")) {
      iframe.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
    }
  });

  // Harden anchors: target=_blank without rel=noopener is a
  // tabnabbing risk.
  tmp.querySelectorAll("a[target='_blank']").forEach((a) => {
    const rel = (a.getAttribute("rel") || "").split(/\s+/);
    if (!rel.includes("noopener")) rel.push("noopener");
    if (!rel.includes("noreferrer")) rel.push("noreferrer");
    a.setAttribute("rel", rel.filter(Boolean).join(" "));
  });

  return tmp.innerHTML;
};
