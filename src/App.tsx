import React, { Suspense, lazy } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import FaviconManager from "@/features/site/FaviconManager";
import { InlineEditProvider } from "@/features/admin/InlineEditContext";
import AdminToolbar from "@/features/admin/AdminToolbar";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { queryClient } from "@/lib/queryClient";
import { siteContentQueryKey } from "@/hooks/useSiteContent";
// Public routes — eager-loaded so the homepage paints without a network round-trip.
import Index from "./pages/Index.tsx";
import Blog from "./pages/Blog.tsx";
import BlogPost from "./pages/BlogPost.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import CmsPage from "./pages/CmsPage.tsx";
import NotFound from "./pages/NotFound.tsx";
// Admin routes — lazy-loaded. These pages pull in @tiptap, @dnd-kit, recharts,
// and the rest of the editor stack. Code-splitting them keeps that ~MB of
// JS out of the public bundle so visitors get a fast INP.
const Admin = lazy(() => import("./pages/Admin.tsx"));
const AdminProfile = lazy(() => import("./pages/AdminProfile.tsx"));
const AdminInsights = lazy(() => import("./pages/AdminInsights.tsx"));
import { useAnalyticsBeacon } from "@/hooks/useAnalyticsBeacon";
import CookieConsent from "@/features/site/CookieConsent";

/**
 * Branded fallback shown while an admin chunk is downloading. Keeps the
 * jump from "click admin link" to "first paint" feeling intentional, and
 * uses the brand's secondary color so it doesn't look like a default
 * spinner. Public visitors never see this — only admins navigating into
 * /admin/* routes.
 */
const AdminChunkFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 rounded-full border-2 border-secondary/30 border-t-secondary animate-spin" />
      <p className="font-body text-xs uppercase tracking-[0.25em] text-muted-foreground">
        Loading admin
      </p>
    </div>
  </div>
);


/**
 * Bridge between the imperative `invalidateSiteContent()` helper (used
 * by admin code outside React) and the QueryClient. We listen for a
 * custom DOM event and call queryClient.invalidateQueries — this lets
 * ANY module bust the cache without needing a hook context.
 */
const SiteContentInvalidator = () => {
  React.useEffect(() => {
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


/** Loads brand settings and applies CSS vars on mount */
const BrandLoader = () => { useBrandSettings(); return null; };

const HighlightListener = () => {
  React.useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== "HIGHLIGHT_SECTION") return;
      const el = document.querySelector(`[data-section="${e.data.sectionKey}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLElement).style.outline = "2px solid rgba(229,197,79,0.6)";
      (el as HTMLElement).style.outlineOffset = "4px";
      setTimeout(() => {
        (el as HTMLElement).style.outline = "";
        (el as HTMLElement).style.outlineOffset = "";
      }, 2000);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);
  return null;
};

/** Only show AdminToolbar on front-end pages, not /admin */
const ConditionalToolbar = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin")) return null;
  return <AdminToolbar />;
};

/**
 * Mounts the unified analytics beacon on every public route. Lives in its
 * own component so the hook only runs inside <BrowserRouter> (it depends
 * on useLocation).
 */
const AnalyticsBeaconMount = () => {
  useAnalyticsBeacon();
  return null;
};

/**
 * Per-route boundary: if a single page errors out, we still keep the
 * router and the rest of the app interactive (back button, other tabs).
 */
const PageBoundary = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary label="page">{children}</ErrorBoundary>
);

const App = () => (
  // Outermost boundary — last line of defence against a totally
  // unrecoverable render error. Every layer below it (router, query
  // client, providers) is wrapped so any thrown error gets a fallback.
  <ErrorBoundary label="app">
    <QueryClientProvider client={queryClient}>
      <SiteContentInvalidator />
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <FaviconManager />
        <BrandLoader />
        <HighlightListener />
        <InlineEditProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<PageBoundary><Index /></PageBoundary>} />
              <Route path="/blog" element={<PageBoundary><Blog /></PageBoundary>} />
              <Route path="/blog/:slug" element={<PageBoundary><BlogPost /></PageBoundary>} />
              <Route
                path="/admin"
                element={
                  <PageBoundary>
                    <Suspense fallback={<AdminChunkFallback />}>
                      <Admin />
                    </Suspense>
                  </PageBoundary>
                }
              />
              <Route
                path="/admin/profile"
                element={
                  <PageBoundary>
                    <Suspense fallback={<AdminChunkFallback />}>
                      <AdminProfile />
                    </Suspense>
                  </PageBoundary>
                }
              />
              <Route
                path="/admin/ai-insights"
                element={
                  <PageBoundary>
                    <Suspense fallback={<AdminChunkFallback />}>
                      <AdminInsights />
                    </Suspense>
                  </PageBoundary>
                }
              />
              <Route
                path="/admin/insights"
                element={
                  <PageBoundary>
                    <Suspense fallback={<AdminChunkFallback />}>
                      <AdminInsights />
                    </Suspense>
                  </PageBoundary>
                }
              />
              <Route path="/unsubscribe" element={<PageBoundary><Unsubscribe /></PageBoundary>} />
              <Route path="/p/:slug" element={<PageBoundary><CmsPage /></PageBoundary>} />
              <Route path="/:slug" element={<PageBoundary><CmsPage /></PageBoundary>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <AnalyticsBeaconMount />
            <ConditionalToolbar />
            <CookieConsent />
          </BrowserRouter>
        </InlineEditProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);


export default App;
