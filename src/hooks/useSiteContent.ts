import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache: Record<string, any> = {};

const isPreviewMode = () =>
  new URLSearchParams(window.location.search).get("preview") === "1";

export const useSiteContent = <T = any>(sectionKey: string, fallback: T): T => {
  const [content, setContent] = useState<T>(cache[sectionKey] || fallback);

  useEffect(() => {
    if (cache[sectionKey]) {
      setContent(cache[sectionKey]);
      return;
    }

    const load = async () => {
      const preview = isPreviewMode();
      const { data } = await supabase
        .from("site_content")
        .select("content, draft_content")
        .eq("section_key", sectionKey)
        .maybeSingle() as any;

      if (data) {
        const resolved = preview
          ? (data.draft_content || data.content)
          : data.content;
        if (resolved) {
          cache[sectionKey] = resolved;
          setContent(resolved as T);
        }
      }
    };
    load();
  }, [sectionKey]);

  return content;
};

/** Invalidate cache after admin edits */
export const invalidateSiteContent = (sectionKey: string) => {
  delete cache[sectionKey];
};
