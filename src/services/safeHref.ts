/**
 * safeHref: the only kinds of link a CMS field may put on the public
 * site. Navbar, footer and card links are typed by an admin and stored
 * as plain strings, so a `javascript:` or `data:` address would run in
 * the visitor's browser if we printed it as it is.
 *
 * Allowed: http(s), mailto, tel, site paths ("/blog/"), page anchors
 * ("#contact") and query-only links. Anything else becomes "#".
 */
const ALLOWED = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#|\?)/i;

export const safeHref = (value: unknown, fallback = "#"): string => {
  if (typeof value !== "string") return fallback;
  // Browsers ignore tabs, new lines and leading control characters inside
  // a scheme ("java\tscript:"), so strip them before testing.
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (!cleaned) return fallback;
  return ALLOWED.test(cleaned) ? cleaned : fallback;
};
