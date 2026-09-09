import { Suspense, lazy } from "react";
import { useLocation } from "react-router-dom";
import { useAdminStatus } from "@/hooks/useAdminStatus";

/* The floating admin toolbar exists only for a signed-in admin on a
   public page; its code loads only then. */
const AdminToolbar = lazy(() => import("@/features/admin/AdminToolbar"));

const ConditionalToolbar = () => {
  const { pathname } = useLocation();
  const { isAdmin } = useAdminStatus();
  if (pathname.startsWith("/admin") || !isAdmin) return null;
  return (
    <Suspense fallback={null}>
      <AdminToolbar />
    </Suspense>
  );
};

export default ConditionalToolbar;
