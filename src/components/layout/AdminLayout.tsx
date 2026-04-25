import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import AdminChunkFallback from "@/components/app/AdminChunkFallback";

/**
 * Layout for every /admin/* route. Wraps lazy admin chunks in a
 * Suspense fallback and a page-scoped ErrorBoundary so a single
 * admin page crash never takes down the rest of the app.
 */
const AdminLayout = () => (
  <ErrorBoundary label="page">
    <Suspense fallback={<AdminChunkFallback />}>
      <Outlet />
    </Suspense>
  </ErrorBoundary>
);

export default AdminLayout;
