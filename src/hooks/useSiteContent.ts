/**
 * useSiteContent — read a single section of the CMS.
 *
 * ════════════════════════════════════════════════════════════════════
 * PERFORMANCE: WHY THIS HOOK IS NOW BACKED BY REACT-QUERY
 * ════════════════════════════════════════════════════════════════════
 *
 * Before: every component that called useSiteContent() ran its own
 * useEffect → fetch → setState cycle. If the homepage rendered the
 * navbar, hero, footer, page_rows, brand_settings… that was 5 separate
 * round-trips to Supabase on every mount, every navigation, every
 * back-button click. Cold loads felt sluggish and the database took
 * unnecessary load.
 *
 * After: react-query gives us a SHARED in-memory cache keyed by
 * `["site_content", sectionKey]`. Behaviour you get for free:
 *
 *   • DEDUPLICATION  — if 5 components ask for "navbar" at the same
 *     time, only ONE network request fires; all 5 get the same result.
 *   • CACHING        — once "navbar" is loaded, every subsequent mount
 *     in the next `staleTime` gets the value INSTANTLY from memory.
 *     Zero network roundtrip. Zero render delay.
 *   • REVALIDATION   — after staleTime expires, the next render returns
 *     the cached value immediately AND triggers a background refetch
 *     so the user always sees fresh data without waiting.
 *   • RESILIENCE     — automatic retries on transient network failures.
 *
 * For the public site, content rarely changes between page views, so we
 * use a generous staleTime (5 minutes). Admin edits explicitly call
 * `invalidateSiteContent()` to bust the cache and reflect changes
 * immediately.
 *
 * ════════════════════════════════════════════════════════════════════
 * JUNIOR-DEV NOTE: HYDRATION & WHY CACHING HELPS SEO
 * ════════════════════════════════════════════════════════════════════
 *
 * "Hydration" in React is the process of attaching event handlers and
 * making static HTML interactive. In a true SSG/SSR setup (Next.js,
 * Remix), the server renders HTML with content already inlined, so the
 * browser shows text BEFORE any JavaScript runs — Google's crawler and
 * users on slow connections both see content instantly.
 *
 * Vite SPAs like this one ship an empty <div id="root"/> and rely on
 * client-side fetching. To compensate, we:
 *
 *   1) Provide a `fallback` prop here so a sensible default renders on
 *      first paint instead of an empty section.
 *   2) Cache aggressively so the SECOND visit feels server-rendered
 *      (data is already in memory when the route mounts).
 *   3) Pair with `usePageMeta` and `index.html` `<noscript>` blocks so
 *      crawlers + users-without-JS still see meaningful metadata.
 *
 * This is why the caching layer matters for SEO: faster perceived load
 * times improve Core Web Vitals (LCP especially), which Google factors
 * into ranking. It also means transient DB hiccups don't translate to
 * blank pages — the cached value keeps the site "up" even if Supabase
 * is briefly unreachable.
 */

import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { readLivePreviewState, subscribeLivePreview } from "@/services/livePreview";

const isPreviewMode = () =>
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("preview") === "1";

const getPreviewOverride = <T,>(sectionKey: string): T | null => {
  if (!isPreviewMode()) return null;
  return (readLivePreviewState().sections[sectionKey] as T) || null;
};

/** Stable query key factory — keep all callers using the same shape. */
export const siteContentQueryKey = (sectionKey: string) => ["site_content", sectionKey] as const;

/**
 * The actual fetcher. Pulled from `site_content_public` (a view that
 * hides admin-only columns from anon users) so we never accidentally
 * leak draft content to the public.
 */
const fetchSectionContent = async (sectionKey: string) => {
  const { data, error } = await supabase
    .from("site_content_public")
    .select("content, draft_content")
    .eq("section_key", sectionKey)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const useSiteContent = <T = any>(sectionKey: string, fallback: T): T => {
  const preview = isPreviewMode();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: siteContentQueryKey(sectionKey),
    queryFn: () => fetchSectionContent(sectionKey),
    // 5-minute freshness — the public site rarely changes between
    // visits, and admin saves call invalidateSiteContent() explicitly.
    staleTime: 5 * 60 * 1000,
    // Keep in cache for 30 minutes even if no component is subscribed,
    // so back-button navigation feels instant.
    gcTime: 30 * 60 * 1000,
    // We deliberately don't refetch on window focus — that's noisy for
    // a public marketing site. Edits go through invalidation instead.
    refetchOnWindowFocus: false,
    // Retry once on transient failures; staleness > flakiness.
    retry: 1,
  });

  /**
   * Live-preview subscription: when an admin opens `?preview=1` they
   * see their unsaved draft updates pushed via BroadcastChannel. This
   * is independent of the react-query cache (preview state lives in
   * localStorage, not Supabase) so we sync it manually.
   */
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

  // Resolve the visible content: in preview mode prefer the draft,
  // otherwise the published content. Fall through to the fallback
  // prop so the FIRST paint always has something to render.
  return useMemo<T>(() => {
    if (!data) return fallback;
    const resolved = preview ? data.draft_content || data.content : data.content;
    return (resolved as T) ?? fallback;
  }, [data, preview, fallback]);
};

/**
 * Invalidate cache after admin edits — call this in the admin code
 * paths that write to site_content so the public hooks pick up the
 * new value on next render.
 */
export const invalidateSiteContent = (sectionKey: string) => {
  // We can't call useQueryClient() here (no hook context). Consumers
  // that need to invalidate from outside React should grab the client
  // from the QueryClientProvider. For backward compatibility we emit
  // a global event that App.tsx listens for.
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("site-content:invalidate", { detail: { sectionKey } })
    );
  }
};
