import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const CANONICAL_ORIGIN = "https://themagiccoffin.com";

const ensureTrailingSlash = (path: string) =>
  path.endsWith("/") ? path : `${path}/`;

interface PageMetaProps {
  title?: string;
  description?: string;
  ogImage?: string;
  suffix?: string;
}

const usePageMeta = ({ title, description, ogImage, suffix = "The Magic Coffin for Silly Vampires" }: PageMetaProps) => {
  const location = useLocation();

  useEffect(() => {
    if (typeof document === "undefined") return;

    const pageTitle = title ? `${title} | ${suffix}` : suffix;
    document.title = pageTitle;

    const canonicalUrl = `${CANONICAL_ORIGIN}${ensureTrailingSlash(location.pathname)}`;

    const setMeta = (name: string, content: string, property?: boolean) => {
      if (!content) return;
      const attr = property ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };

    // Canonical link
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);

    if (description) setMeta("description", description);
    setMeta("og:title", pageTitle, true);
    if (description) setMeta("og:description", description, true);
    if (ogImage) setMeta("og:image", ogImage, true);
    setMeta("og:url", canonicalUrl, true);
    setMeta("twitter:title", pageTitle);
    if (description) setMeta("twitter:description", description);
    if (ogImage) setMeta("twitter:image", ogImage);

    return () => {
      document.title = suffix;
    };
  }, [title, description, ogImage, suffix, location.pathname]);
};

export default usePageMeta;
