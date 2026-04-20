/**
 * useSiteContent — read a single section of the CMS.
 */

import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { readLivePreviewState, subscribeLivePreview } from "@/services/livePreview";
import { fetchPublicSection } from "@/services/siteContent";

const isPreviewMode = () =>
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("preview") === "1";

const getPreviewOverride = <T,>(sectionKey: string): T | null => {
  if (!isPreviewMode()) return null;
  return (readLivePreviewState().sections[sectionKey] as T) || null;
};

export const siteContentQueryKey = (sectionKey: string) => ["site_content", sectionKey] as const;

const fetchSectionContent = async (sectionKey: string) => {
  const { data, error } = await fetchPublicSection(sectionKey, "content,draft_content");
  if (error) throw error;
  return data;
};

export const useSiteContentWithStatus = <T = any>(
  sectionKey: string,
  fallback: T,
): { data: T | null; isLoading: boolean; content: T } => {
  const preview = isPreviewMode();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: siteContentQueryKey(sectionKey),
    queryFn: () => fetchSectionContent(sectionKey),
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    retry: 1,
  });

  useEffect(() => {
    if (!preview) return;
    const sync = () => {
      const next = getPreviewOverride<T>(sectionKey);
      if (next) {
        queryClient.setQueryData(siteContentQueryKey(sectionKey), {
          content: next,
          draft_content: next,
        });
      }
    };
    sync();
    return subscribeLivePreview(sync);
  }, [preview, sectionKey, queryClient]);

  return useMemo(() => {
    const raw = query.data;
    const resolved = raw
      ? ((preview ? raw.draft_content || raw.content : raw.content) as T)
      : null;

    return {
      data: resolved,
      isLoading: query.isLoading,
      content: resolved ?? fallback,
    };
  }, [query.data, query.isLoading, preview, fallback]);
};

export const useSiteContent = <T = any>(sectionKey: string, fallback: T): T => {
  const preview = isPreviewMode();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: siteContentQueryKey(sectionKey),
    queryFn: () => fetchSectionContent(sectionKey),
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    retry: 1,
  });

  useEffect(() => {
    if (!preview) return;
    const sync = () => {
      const next = getPreviewOverride<T>(sectionKey);
      if (next) {
        queryClient.setQueryData(siteContentQueryKey(sectionKey), {
          content: next,
          draft_content: next,
        });
      }
    };
    sync();
    return subscribeLivePreview(sync);
  }, [preview, sectionKey, queryClient]);

  return useMemo<T>(() => {
    if (!data) return fallback;
    const resolved = preview ? data.draft_content || data.content : data.content;
    return (resolved as T) ?? fallback;
  }, [data, preview, fallback]);
};

export const invalidateSiteContent = (sectionKey: string) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("site-content:invalidate", { detail: { sectionKey } })
    );
  }
};
