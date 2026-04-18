import { useEffect } from "react";
import { useSiteContent } from "@/hooks/useSiteContent";

/**
 * Manages the favicon based on browser color scheme (light/dark).
 * Reads favicon URLs from the "branding" section in site_content.
 */
const FaviconManager = () => {
  const branding = useSiteContent<Record<string, any>>("branding", {});

  useEffect(() => {
    const faviconLight = branding.favicon_light || "";
    const faviconDark = branding.favicon_dark || "";

    if (!faviconLight && !faviconDark) return;

    const setFavicon = (url: string) => {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = url;
      link.type = url.endsWith(".svg") ? "image/svg+xml" : "image/png";
    };

    const updateFavicon = (isDark: boolean) => {
      if (isDark && faviconDark) {
        setFavicon(faviconDark);
      } else if (faviconLight) {
        setFavicon(faviconLight);
      }
    };

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    updateFavicon(mql.matches);

    const handler = (e: MediaQueryListEvent) => updateFavicon(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [branding.favicon_light, branding.favicon_dark]);

  return null;
};

export default FaviconManager;
