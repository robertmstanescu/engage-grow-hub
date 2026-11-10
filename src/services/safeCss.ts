/**
 * safeCss: custom CSS typed in the admin is printed inside a <style>
 * element. A closing </style> (or a <script>) in that text would end
 * the element early in the prerendered HTML and let markup follow it,
 * so every angle-bracket tag is removed before the CSS is printed.
 * CSS itself never needs "<tag>" text; child selectors use ">" alone.
 */
export const safeCss = (raw: unknown): string => {
  if (typeof raw !== "string" || !raw) return "";
  return raw.replace(/<\/?[a-z!][^>]*>?/gi, "");
};
