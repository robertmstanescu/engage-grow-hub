import { lazy } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Route,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
} from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import CookieConsent from "@/features/site/CookieConsent";
import { queryClient } from "@/lib/queryClient";
import PublicLayout from "@/components/layout/PublicLayout";
import AdminLayout from "@/components/layout/AdminLayout";
import GlobalMounts from "@/components/app/GlobalMounts";
import AnalyticsBeaconMount from "@/components/app/AnalyticsBeaconMount";
import ConditionalToolbar from "@/components/app/ConditionalToolbar";
// Index stays eager so the homepage — the site's highest-priority URL —
// paints without an extra chunk round-trip. Unsubscribe is tiny and
// reached only from an email link, no real bundle weight either way.
import Index from "./pages/Index";
import Unsubscribe from "./pages/Unsubscribe";
import NotFound from "./pages/NotFound";
// Blog/BlogPost/CmsPage are lazy: each pulls in its own data-fetching and
// rendering code that a visitor landing on a DIFFERENT public route (say,
// the homepage) never needs — same reasoning as the admin split below,
// just one tier down. PublicLayout supplies the Suspense boundary.
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const CmsPage = lazy(() => import("./pages/CmsPage"));
// Admin routes — lazy so the editor stack stays out of the public bundle.
const Admin = lazy(() => import("./pages/Admin"));
const AdminProfile = lazy(() => import("./pages/AdminProfile"));
const AdminInsights = lazy(() => import("./pages/AdminInsights"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));

/**
 * RootShell — mounted once at the root of the router so
 * AnalyticsBeaconMount / ConditionalToolbar / CookieConsent (which need
 * router context, e.g. useLocation) render alongside every matched
 * route instead of living inside the old <BrowserRouter> as bare
 * <Routes> siblings. AdminDashboard's unsaved-changes guard uses
 * react-router's useBlocker, which THROWS unless the app is wired up
 * with a data router (createBrowserRouter + RouterProvider) — this
 * file was still on the older declarative <BrowserRouter>/<Routes>
 * API, which crashed the entire /admin section on every load
 * ("useBlocker must be used within a data router"). Migrating here
 * fixes that without changing any route's matching behavior —
 * createRoutesFromElements produces the identical route table from
 * the same JSX.
 */
const RootShell = () => (
  <>
    <Outlet />
    <AnalyticsBeaconMount />
    <ConditionalToolbar />
    <div className="public-fluid-type">
      <CookieConsent />
    </div>
  </>
);

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootShell />}>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Index />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />
        <Route path="/services/:slug" element={<CmsPage prefix="services/" />} />
        <Route path="/p/:slug" element={<CmsPage />} />
        <Route path="/:slug" element={<CmsPage />} />
      </Route>
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/dashboard" element={<Admin />} />
        <Route path="/admin/site" element={<Admin />} />
        <Route path="/admin/site/pages/:pageId" element={<Admin />} />
        {/* Catch-all for the remaining simple tabs (pages, blog,
            contacts, emails, media, brand, tags, redirects, settings,
            team, seo_master, versions, navigation) — react-router ranks
            the static routes above by specificity, so they always win
            over this dynamic one. AdminDashboard validates `:tab`
            against the known Tab union and falls back to "overview"
            for anything else. */}
        <Route path="/admin/:tab" element={<Admin />} />
        <Route path="/admin/profile" element={<AdminProfile />} />
        <Route path="/admin/ai-insights" element={<AdminInsights />} />
        <Route path="/admin/insights" element={<AdminInsights />} />
      </Route>
      <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Route>,
  ),
);

const App = () => (
  <ErrorBoundary label="app">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GlobalMounts />
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
