import { lazy } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import FaviconManager from "@/features/site/FaviconManager";
import { InlineEditProvider } from "@/features/admin/InlineEditContext";
import CookieConsent from "@/features/site/CookieConsent";
import { queryClient } from "@/lib/queryClient";
import PublicLayout from "@/components/layout/PublicLayout";
import AdminLayout from "@/components/layout/AdminLayout";
import SiteContentInvalidator from "@/components/app/SiteContentInvalidator";
import BrandLoader from "@/components/app/BrandLoader";
import HighlightListener from "@/components/app/HighlightListener";
import AnalyticsBeaconMount from "@/components/app/AnalyticsBeaconMount";
import ConditionalToolbar from "@/components/app/ConditionalToolbar";
// Public routes — eager-loaded so the homepage paints without a network round-trip.
import Index from "./pages/Index";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Unsubscribe from "./pages/Unsubscribe";
import CmsPage from "./pages/CmsPage";
import NotFound from "./pages/NotFound";
// Admin routes — lazy-loaded; keeps the editor stack out of the public bundle.
const Admin = lazy(() => import("./pages/Admin"));
const AdminProfile = lazy(() => import("./pages/AdminProfile"));
const AdminInsights = lazy(() => import("./pages/AdminInsights"));

const App = () => (
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
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/unsubscribe" element={<Unsubscribe />} />
                <Route path="/p/:slug" element={<CmsPage />} />
                <Route path="/:slug" element={<CmsPage />} />
              </Route>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/dashboard" element={<Admin />} />
                <Route path="/admin/site" element={<Admin />} />
                <Route path="/admin/profile" element={<AdminProfile />} />
                <Route path="/admin/ai-insights" element={<AdminInsights />} />
                <Route path="/admin/insights" element={<AdminInsights />} />
              </Route>
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
