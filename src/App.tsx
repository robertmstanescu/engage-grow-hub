import { lazy } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { InlineEditProvider } from "@/features/admin/InlineEditContext";
import CookieConsent from "@/features/site/CookieConsent";
import { queryClient } from "@/lib/queryClient";
import PublicLayout from "@/components/layout/PublicLayout";
import AdminLayout from "@/components/layout/AdminLayout";
import GlobalMounts from "@/components/app/GlobalMounts";
import AnalyticsBeaconMount from "@/components/app/AnalyticsBeaconMount";
import ConditionalToolbar from "@/components/app/ConditionalToolbar";
// Public routes — eager so the homepage paints without a round-trip.
import Index from "./pages/Index";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Unsubscribe from "./pages/Unsubscribe";
import CmsPage from "./pages/CmsPage";
import NotFound from "./pages/NotFound";
// Admin routes — lazy so the editor stack stays out of the public bundle.
const Admin = lazy(() => import("./pages/Admin"));
const AdminProfile = lazy(() => import("./pages/AdminProfile"));
const AdminInsights = lazy(() => import("./pages/AdminInsights"));

const App = () => (
  <ErrorBoundary label="app">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GlobalMounts />
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
            <div className="public-fluid-type">
              <CookieConsent />
            </div>
          </BrowserRouter>
        </InlineEditProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
