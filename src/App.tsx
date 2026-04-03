import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import FaviconManager from "@/components/FaviconManager";
import { InlineEditProvider } from "@/components/admin/InlineEditContext";
import AdminToolbar from "@/components/admin/AdminToolbar";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import Index from "./pages/Index.tsx";
import Blog from "./pages/Blog.tsx";
import BlogPost from "./pages/BlogPost.tsx";
import Admin from "./pages/Admin.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import CmsPage from "./pages/CmsPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <FaviconManager />
      <BrandLoader />
      <InlineEditProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/p/:slug" element={<CmsPage />} />
            <Route path="/:slug" element={<CmsPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <AdminToolbar />
        </BrowserRouter>
      </InlineEditProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
