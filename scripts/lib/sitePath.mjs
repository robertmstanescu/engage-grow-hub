/**
 * US10: a site path ends with "/" before any query or anchor, the same
 * address the sitemap and canonical tags use. File paths ("/llms.txt"),
 * the root and anything that is not a site path pass through unchanged.
 * Shared by the public `safeHref` and the prerender's server copy.
 */
export function withTrailingSlash(href) {
  if (typeof href !== "string" || !href.startsWith("/") || href.startsWith("//")) return href;
  const cut = href.search(/[?#]/);
  const path = cut === -1 ? href : href.slice(0, cut);
  const rest = cut === -1 ? "" : href.slice(cut);
  if (path.endsWith("/")) return href;
  const last = path.slice(path.lastIndexOf("/") + 1);
  if (last.includes(".")) return href;
  return `${path}/${rest}`;
}
