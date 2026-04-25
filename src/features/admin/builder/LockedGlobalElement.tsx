/**
 * LockedGlobalElement — visual stand-in for the site Header / Footer
 * inside the Builder canvas (EPIC 3 / US 3.5).
 *
 * WHY a placeholder instead of the live <Navbar /> / <Footer />?
 *   - <Navbar /> is `position: fixed` and would escape the canvas
 *     to the real viewport, ruining the WYSIWYG illusion.
 *   - The canvas is for EDITING PAGE ROWS. Header/Footer are global
 *     and live in their own admin tabs. A clearly-locked placeholder
 *     is the standard builder convention (Webflow / Framer / etc.)
 *     because it tells the editor "this exists, but you can't touch
 *     it from here" without inviting accidental clicks on the live
 *     navigation links.
 *
 * Clicking the overlay routes the admin to the dedicated global
 * editor tab (`navigation` for headers, `settings` → footer
 * accordion for footers).
 */
import { Lock, PanelTop, PanelBottom } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LockedGlobalElementProps {
  kind: "header" | "footer";
}

const LockedGlobalElement = ({ kind }: LockedGlobalElementProps) => {
  const navigate = useNavigate();
  const isHeader = kind === "header";

  const label = isHeader ? "Global Header" : "Global Footer";
  const Icon = isHeader ? PanelTop : PanelBottom;
  const editLabel = isHeader ? "Edit Global Header" : "Edit Global Footer";

  const handleEdit = () => {
    // The Global Elements editor lives across two existing admin
    // tabs:
    //   • Header → "navigation" tab (NavigationManager)
    //   • Footer → "settings"   tab (GlobalSettings → Footer accordion)
    // We use a query param so AdminDashboard can land on the right
    // tab without re-implementing the whole nav.
    const tab = isHeader ? "navigation" : "settings";
    navigate(`/admin?tab=${tab}`);
  };

  return (
    <div
      className="relative w-full select-none"
      // The placeholder is a striped band that visually distinguishes
      // itself from real, editable rows. Header gets a slightly
      // taller strip to mimic typical site chrome.
      style={{
        height: isHeader ? 64 : 96,
        backgroundImage:
          "repeating-linear-gradient(45deg, hsl(var(--muted) / 0.4) 0 8px, hsl(var(--muted) / 0.15) 8px 16px)",
        borderTop: !isHeader ? "1px solid hsl(var(--border) / 0.4)" : undefined,
        borderBottom: isHeader ? "1px solid hsl(var(--border) / 0.4)" : undefined,
      }}
      aria-label={`${label} (locked)`}
    >
      {/* Static label — visible at all times so editors know what
          this strip represents even when not hovered. */}
      <div
        className="absolute inset-0 flex items-center justify-center gap-2 font-body text-xs uppercase tracking-[0.18em] pointer-events-none"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        <Icon size={14} />
        <span>{label}</span>
      </div>

      {/* Hover overlay — covers the strip and offers the CTA. The
          parent strip has no other interactive children, so a single
          full-bleed button is the simplest correct hit-target. */}
      <button
        type="button"
        onClick={handleEdit}
        className="absolute inset-0 flex items-center justify-center gap-2 font-body text-xs uppercase tracking-[0.18em] font-medium opacity-0 hover:opacity-100 transition-opacity"
        style={{
          backgroundColor: "hsl(var(--background) / 0.85)",
          color: "hsl(var(--foreground))",
          backdropFilter: "blur(2px)",
        }}
      >
        <Lock size={13} />
        <span>{editLabel}</span>
      </button>
    </div>
  );
};

export default LockedGlobalElement;
