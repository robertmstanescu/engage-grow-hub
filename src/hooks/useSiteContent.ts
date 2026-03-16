import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache: Record<string, any> = {};

export const useSiteContent = <T = any>(sectionKey: string, fallback: T): T => {
  const [content, setContent] = useState<T>(cache[sectionKey] || fallback);

  useEffect(() => {
    if (cache[sectionKey]) {
      setContent(cache[sectionKey]);
      return;
    }

    const fetch = async () => {
      const { data } = await supabase
        .from("site_content")
        .select("content")
        .eq("section_key", sectionKey)
        .maybeSingle();

      if (data?.content) {
        cache[sectionKey] = data.content;
        setContent(data.content as T);
      }
    };
    fetch();
  }, [sectionKey]);

  return content;
};

/** Invalidate cache after admin edits */
export const invalidateSiteContent = (sectionKey: string) => {
  delete cache[sectionKey];
};
