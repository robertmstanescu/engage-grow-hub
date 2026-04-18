/**
 * Shared QueryClient for the entire app.
 *
 * Centralised here (not inline in App.tsx) so:
 *   • Tests and stories can import the same instance.
 *   • Modules outside the React tree (e.g. service helpers) can grab
 *     the client and invalidate caches imperatively.
 *
 * Defaults are tuned for a CONTENT SITE, not a real-time dashboard:
 *   • staleTime  5 min — content barely changes; avoid refetch storms.
 *   • gcTime     30 min — survive back-button navigation cheaply.
 *   • refetchOnWindowFocus false — no noisy revalidation on tab switch.
 *   • retry      1 — one retry on flaky network, then surface the error.
 */

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 30s, then revalidate in the background so
      // edits made in /admin show up on the public site after a quick
      // navigation or tab focus.
      staleTime: 30 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnMount: "always",
      retry: 1,
    },
  },
});
