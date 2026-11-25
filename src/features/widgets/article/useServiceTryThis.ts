import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { serviceForCategory, tryThisFromRows } from "./postRows";

/**
 * The "Try this" paragraph of the service page that a post's category
 * belongs to, read from that page's published rows so the words live in
 * one place (owner, 25 Nov 2026). "" for General posts, while loading,
 * or when the request fails: the post then shows the plain related
 * service card instead, so nothing breaks.
 */
export const useServiceTryThis = (category?: string | null): string => {
  const pageSlug = serviceForCategory(category)?.pageSlug || "";
  const [html, setHtml] = useState("");

  useEffect(() => {
    setHtml("");
    if (!pageSlug) return;
    let cancelled = false;
    supabase
      .from("cms_pages")
      .select("page_rows")
      .eq("slug", pageSlug)
      .maybeSingle()
      .then(
        ({ data, error }) => {
          if (cancelled || error || !data) return;
          setHtml(tryThisFromRows((data as { page_rows?: unknown }).page_rows));
        },
        () => { /* network failure: keep the plain card */ },
      );
    return () => { cancelled = true; };
  }, [pageSlug]);

  return html;
};
