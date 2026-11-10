import { currentFace } from "@/lib/typefaces";
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

  // Two faces changed on 10 Nov 2026 (lib/typefaces.ts). Text saved with
  // an old name inline is read as the new face; the stored copy is untouched.
  return currentFace(stripRichTextFontSizes(sanitized));
};
