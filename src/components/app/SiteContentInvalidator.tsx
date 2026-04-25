import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";
import { siteContentQueryKey } from "@/hooks/useSiteContent";

/**
 * Bridges the imperative `invalidateSiteContent()` helper (used by
 * non-React modules) to the QueryClient via a custom DOM event, so any
 * module can bust the site-content cache without a hook context.
 */
const SiteContentInvalidator = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ sectionKey: string }>).detail;
      if (!detail?.sectionKey) return;
      queryClient.invalidateQueries({ queryKey: siteContentQueryKey(detail.sectionKey) });
    };
    window.addEventListener("site-content:invalidate", handler);
    return () => window.removeEventListener("site-content:invalidate", handler);
  }, []);
  return null;
};

export default SiteContentInvalidator;
