import { Outlet } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui/error-boundary";

/**
 * Layout for every public-facing route. Wraps the matched child in a
 * page-scoped ErrorBoundary so a single page crash never takes down
 * the router or other tabs.
 */
const PublicLayout = () => (
  <ErrorBoundary label="page">
    <div className="public-fluid-type">
      <Outlet />
    </div>
  </ErrorBoundary>
);

export default PublicLayout;
