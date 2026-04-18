import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAdminStatus } from "@/hooks/useAdminStatus";

/**
 * useIsMobileViewport
 * Listens for screens < 768px so the cogwheel can hide itself on
 * phones. Per spec: the floating admin entry point should only appear
 * on desktop where it doesn't compete with the cookie consent toast,
 * the navbar, and any sticky CTAs.
 */
const useIsMobileViewport = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return isMobile;
};

/**
 * TopRightSettingsCog
 * ───────────────────
 * Single floating control for admins on the live front-end. The previous
 * "Select" / "Edit" pill buttons were removed (per the Premium Mobile UI
 * overhaul) because they cluttered the bottom-right of the screen and
 * conflicted with the cookie consent toast. All editing is now reached
 * via the cogwheel → /admin dashboard.
 *
 * Positioning: fixed top-right with a high z-index so it stays clear of
 * navbars, modals, and the consent gate. A subtle backdrop-blur keeps
 * the icon legible over hero imagery and dark gradients alike.
 */
const AdminToolbar = () => {
  const { isAdmin, loading } = useAdminStatus();
  const navigate = useNavigate();
  const isMobile = useIsMobileViewport();

  // Hide on mobile — admins reach /admin via direct URL on phones; the
  // floating cog clutters small viewports.
  if (loading || !isAdmin || isMobile) return null;

  return (
    <button
      onClick={() => navigate("/admin")}
      title="Open admin dashboard"
      aria-label="Open admin dashboard"
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: 9999,
        width: 40,
        height: 40,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Dark purple/charcoal theme + glassy blur so it reads on any bg.
        backgroundColor: "hsl(280 57% 13% / 0.78)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid hsl(50 82% 87% / 0.18)",
        color: "hsl(50 82% 87%)",
        boxShadow: "0 8px 24px -8px hsl(280 57% 8% / 0.5)",
        cursor: "pointer",
        transition: "transform 0.15s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      <Settings size={16} />
    </button>
  );
};

export default AdminToolbar;
