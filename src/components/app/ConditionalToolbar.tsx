import { useLocation } from "react-router-dom";
import AdminToolbar from "@/features/admin/AdminToolbar";

/** Renders the admin toolbar on every route except /admin/*. */
const ConditionalToolbar = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin")) return null;
  return <AdminToolbar />;
};

export default ConditionalToolbar;
