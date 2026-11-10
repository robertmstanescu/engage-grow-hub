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

  // The handwritten face changed from Architects Daughter to Playwrite
  // Cuba (owner, 10 Nov 2026). Text saved with the old name inline keeps
  // working: it is read as the new face, the stored copy is untouched.
  return stripRichTextFontSizes(sanitized).replace(/Architects Daughter/g, "Playwrite CU");
};
