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
    <div aria-hidden className="page-mesh-layer">
      {/* Four drifting blobs. Each holds two pre-painted colour layers
          (its base hue and a second brand hue) that crossfade by opacity,
          so the colour shift costs the compositor nothing. Then a tiled
          film-grain sheet on top. Colours, intensity, grain and motion
          come from the page's hero via CSS variables (see pageMesh.ts). */}
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="page-mesh-blob" data-blob={i}>
          <div className="page-mesh-blob-base" />
          <div className="page-mesh-blob-drift" />
        </div>
      ))}
      <div className="page-mesh-grain" />
    </div>
    <div className="public-fluid-type">
      <Suspense fallback={<PublicChunkFallback />}>
        <Outlet />
      </Suspense>
    </div>
  </ErrorBoundary>
);


export default PublicLayout;
