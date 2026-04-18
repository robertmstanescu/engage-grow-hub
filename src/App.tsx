import React from "react";
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
import Index from "./pages/Index.tsx";
import Blog from "./pages/Blog.tsx";
import BlogPost from "./pages/BlogPost.tsx";
import Admin from "./pages/Admin.tsx";
import AdminProfile from "./pages/AdminProfile.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import CmsPage from "./pages/CmsPage.tsx";
import NotFound from "./pages/NotFound.tsx";

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
              <Route path="/admin" element={<PageBoundary><Admin /></PageBoundary>} />
              <Route path="/admin/profile" element={<PageBoundary><AdminProfile /></PageBoundary>} />
              <Route path="/unsubscribe" element={<PageBoundary><Unsubscribe /></PageBoundary>} />
              <Route path="/p/:slug" element={<PageBoundary><CmsPage /></PageBoundary>} />
              <Route path="/:slug" element={<PageBoundary><CmsPage /></PageBoundary>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <ConditionalToolbar />
          </BrowserRouter>
        </InlineEditProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);


export default App;
