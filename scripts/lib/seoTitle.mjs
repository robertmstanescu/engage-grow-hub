/**
 * ONE title builder for the server copy (scripts/prerender-seo.mjs) and
 * the browser head (src/hooks/usePageMeta.ts), so a page carries the same
 * <title> before and after the app starts (search plan US04, 25 Nov 2026).
 *
 * Rules:
 *   - Every title ends with " | <brand>" exactly once. A search title that
 *     already ends with the brand keeps its own ending.
 *   - Fallback order: the page's search title, then its page title; with
 *     neither, the brand alone. A page title that IS the brand (Home) is
 *     the brand alone.
 *   - At most 60 characters (what search results show). The page part is
 *     cut on a word boundary with an ellipsis so the brand always fits.
 *
 * Plain JavaScript on purpose: the prerender runs under bare node.
 */

/** Search engines show about 60 characters of a title. */
export const TITLE_MAX = 60;

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Trim `value` to `max` characters on a word boundary, with an ellipsis when cut. */
export const clampText = (value, max) => {
  const v = String(value ?? "").trim();
  if (v.length <= max) return v;
  if (max <= 1) return "…".slice(0, Math.max(0, max));
  const cut = v.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s|:,;–—-]+$/, "")}…`;
};

/**
 * Build a page title.
 * @param {{ searchTitle?: string|null, pageTitle?: string|null, brand?: string|null }} input
 * @returns {string}
 */
export function buildPageTitle({ searchTitle, pageTitle, brand } = {}) {
  const b = String(brand ?? "").trim();
  let page = String(searchTitle ?? "").trim() || String(pageTitle ?? "").trim();

  // Strip a brand ending the editor already typed, so it is added once.
  if (b) page = page.replace(new RegExp(`\\s*[|·–—-]\\s*${escapeRegExp(b)}\\s*$`, "i"), "").trim();
  if (!page || (b && page.toLowerCase() === b.toLowerCase())) return b ? clampText(b, TITLE_MAX) : "";
  if (!b) return clampText(page, TITLE_MAX);

  const tail = ` | ${b}`;
  // A brand too long to share the line leaves the page title alone.
  if (tail.length >= TITLE_MAX - 8) return clampText(page, TITLE_MAX);
  return `${clampText(page, TITLE_MAX - tail.length)}${tail}`;
}
