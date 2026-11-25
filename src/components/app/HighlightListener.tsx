import { useEffect } from "react";

/** Highlight commands are accepted only from this site's preview window. */
export const highlightSectionKey = (event: MessageEvent): string | null => {
  if (event.origin !== window.location.origin) return null;
  if (event.source !== window.opener && event.source !== window.parent) return null;
  const data: unknown = event.data;
  if (!data || typeof data !== "object") return null;
  const message = data as Record<string, unknown>;
  if (message.type !== "HIGHLIGHT_SECTION" || typeof message.sectionKey !== "string") return null;
  return /^[a-zA-Z0-9_-]{1,100}$/.test(message.sectionKey) ? message.sectionKey : null;
};

/**
 * Listens for `HIGHLIGHT_SECTION` postMessages (sent by the admin
 * preview frame) and briefly outlines the matching `[data-section]`
 * element on the public page to confirm where it lives.
 */
const HighlightListener = () => {
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const sectionKey = highlightSectionKey(e);
      if (!sectionKey) return;
      const el = document.querySelector(`[data-section="${sectionKey}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLElement).style.outline = "2px solid rgba(229,197,79,0.6)";
      (el as HTMLElement).style.outlineOffset = "4px";
      setTimeout(() => {
        (el as HTMLElement).style.outline = "";
        (el as HTMLElement).style.outlineOffset = "";
      }, 2000);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);
  return null;
};

export default HighlightListener;
