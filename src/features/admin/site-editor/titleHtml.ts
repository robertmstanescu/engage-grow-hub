import { normalizeRichTextHtml } from "@/services/richTextFontSize";

/**
 * Title storage helpers. A title is `title_lines: string[]`, one HTML
 * paragraph per visual line; the editor works on the joined HTML and
 * splits it back here so the stored shape never changes.
 */

/** Split `<p>a</p><p>b</p>` into ["<p>a</p>", "<p>b</p>"]. Drops trailing empties. */
export const splitTitleHtml = (html: string): string[] => {
  const host = document.createElement("div");
  host.innerHTML = html;
  const lines = Array.from(host.children).map((el) => normalizeRichTextHtml(el.outerHTML));
  const empty = (l: string) => /^<p[^>]*>(<br\s*\/?>)?<\/p>$/.test(l);
  while (lines.length > 0 && empty(lines[lines.length - 1])) lines.pop();
  while (lines.length > 0 && empty(lines[0])) lines.shift();
  return lines;
};

/** Legacy lines can be plain strings or `{ text, type }` objects. */
export const toTitleHtmlLine = (line: unknown): string => {
  if (typeof line === "string") return line.trim().startsWith("<") ? line : `<p>${line}</p>`;
  if (line && typeof line === "object") {
    const l = line as { text?: string; type?: string };
    const text = l.text ?? "";
    return l.type === "accent" ? `<p><span style="color: #E5C54F">${text}</span></p>` : `<p>${text}</p>`;
  }
  return "<p></p>";
};
