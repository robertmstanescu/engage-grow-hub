import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import PublicChunkFallback from "@/components/app/PublicChunkFallback";

/**
 * Layout for every public-facing route. Wraps the matched child in a
 * page-scoped ErrorBoundary so a single page crash never takes down
 * the router or other tabs, plus a Suspense boundary for the lazy
 * Blog/BlogPost/CmsPage chunks (Index stays eager so the homepage
 * paints without a round-trip, so it never actually suspends here).
 */
const PublicLayout = () => (
  <ErrorBoundary label="page">
    {/*
      PAGE MESH — one fixed, continuous gradient behind the entire site.
      Rows are transparent by default, so the page
      reads as a single surface instead of stacked blocks. Fixed +
      pointer-events-none keeps it cheap and out of hit-testing.
    */}
    <div aria-hidden className="page-mesh-layer" />
    <div className="public-fluid-type">
      <Suspense fallback={<PublicChunkFallback />}>
        <Outlet />
      </Suspense>
    </div>
  </ErrorBoundary>
);


export default PublicLayout;
