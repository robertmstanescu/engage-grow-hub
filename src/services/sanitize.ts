import DOMPurify from "dompurify";
import { normalizeRichTextHtml } from "@/services/richTextFontSize";

export const sanitizeHtml = (html: string): string => {
  const sanitized = DOMPurify.sanitize(html, {
    ADD_ATTR: ["style", "class"],
  });

  return normalizeRichTextHtml(sanitized);
};
