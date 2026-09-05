import { useEffect } from "react";

/**
 * Marks the current route as non-indexable. Used on admin, auth and other
 * internal-tooling pages that live on the public domain (e.g. /admin/*,
 * /.lovable/oauth/consent) so they can't end up in search results even
 * though robots.txt already disallows crawling them — belt and suspenders,
 * since a page can still get indexed from an external link without ever
 * being crawled per robots.txt.
 */
const useNoIndex = () => {
  useEffect(() => {
    let tag = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const existed = !!tag;
    const previousContent = tag?.getAttribute("content") ?? null;

    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("name", "robots");
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", "noindex, nofollow");

    return () => {
      if (!tag) return;
      if (existed && previousContent !== null) {
        tag.setAttribute("content", previousContent);
      } else {
        tag.remove();
      }
    };
  }, []);
};

export default useNoIndex;
