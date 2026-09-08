import DOMPurify from "dompurify";
import { stripRichTextFontSizes } from "@/services/richTextFontSize";

/**
 * Sanitise CMS HTML for rendering. Besides the XSS pass, every custom
 * font size is stripped so the site's type scale sets all sizes (see
 * stripRichTextFontSizes).
 */
export const sanitizeHtml = (html: string): string => {
  const sanitized = DOMPurify.sanitize(html, {
    ADD_ATTR: ["style", "class", "face"],
  });

  return stripRichTextFontSizes(sanitized);
};
