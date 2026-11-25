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
 * BottomLeftSettingsCog
 * ───────────────────
 * Single floating control for admins on the live front-end. The previous
 * "Select" / "Edit" pill buttons were removed (per the Premium Mobile UI
 * overhaul) because they cluttered the bottom-right of the screen and
 * conflicted with the cookie consent toast. All editing is now reached
 * via the cogwheel → /admin dashboard.
 *
 * Positioning: fixed bottom-left (owner, 25 Nov 2026) so it never sits on
 * the floating menu bar or beside the cookie toast (bottom-right). A subtle backdrop-blur keeps
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
        bottom: "20px",
        left: "20px",
        zIndex: 9999,
        width: 40,
        height: 40,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Dark purple/charcoal theme + glassy blur so it reads on any bg.
        backgroundColor: "hsl(var(--card) / 0.92)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid hsl(var(--border))",
        color: "hsl(var(--foreground))",
        boxShadow: "var(--shadow-soft)",
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
