import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { readLivePreviewState, subscribeLivePreview } from "@/services/livePreview";

const cache: Record<string, any> = {};

const isPreviewMode = () =>
  new URLSearchParams(window.location.search).get("preview") === "1";

const getPreviewOverride = <T,>(sectionKey: string): T | null => {
  if (typeof window === "undefined" || !isPreviewMode()) return null;
  return (readLivePreviewState().sections[sectionKey] as T) || null;
};

export const useSiteContent = <T = any>(sectionKey: string, fallback: T): T => {
  const [content, setContent] = useState<T>(getPreviewOverride<T>(sectionKey) || cache[sectionKey] || fallback);

  useEffect(() => {
    const preview = isPreviewMode();
    const previewOverride = getPreviewOverride<T>(sectionKey);

    if (previewOverride) {
      setContent(previewOverride);
    } else if (cache[sectionKey]) {
      setContent(cache[sectionKey]);
    }

    const unsubscribe = preview
      ? subscribeLivePreview((state) => {
          const next = state.sections[sectionKey];
          if (next) setContent(next as T);
        })
      : undefined;

    const load = async () => {
      const { data } = await supabase
        .from("site_content_public")
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

    return () => {
      unsubscribe?.();
    };
  }, [sectionKey]);

  return content;
};

/** Invalidate cache after admin edits */
export const invalidateSiteContent = (sectionKey: string) => {
  delete cache[sectionKey];
};
