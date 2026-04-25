import { useEffect } from "react";

/**
 * Listens for `HIGHLIGHT_SECTION` postMessages (sent by the admin
 * preview frame) and briefly outlines the matching `[data-section]`
 * element on the public page to confirm where it lives.
 */
const HighlightListener = () => {
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== "HIGHLIGHT_SECTION") return;
      const el = document.querySelector(`[data-section="${e.data.sectionKey}"]`);
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
