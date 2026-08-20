/**
 * Normalize a path for `redirects` table storage/lookup: a single
 * leading slash, no trailing slash (except root "/"), no query or hash.
 * This matches `location.pathname` as seen by `useLocation()`, so no
 * extra transformation is needed at lookup time, and it matches the
 * confirmed slug convention — a CMS page's live path is `"/" + slug`,
 * a blog post's is `"/blog/" + slug`.
 */
export const normalizePath = (p: string): string => {
  let out = p.split("?")[0].split("#")[0].trim();
  if (!out.startsWith("/")) out = `/${out}`;
  if (out.length > 1 && out.endsWith("/")) out = out.slice(0, -1);
  return out;
};
