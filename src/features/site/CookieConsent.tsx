/**
 * CookieConsent — the compact privacy gate.
 * ──────────────────────────────────────────────────────────────────────────
 * Bottom-right floating card, max-width 340px, matching the site's "liquid
 * glass / dark luxury" aesthetic. Two states:
 *
 *   "compact"      Accept | Preferences buttons (initial view)
 *   "preferences"  Explanation + Accept | Reject choices
 *
 * The card never shows once the user has made a decision (consent flag
 * persists in localStorage). This is deliberately the lightest-possible
 * implementation — no third-party SDK, no remote consent registry, just
 * a single boolean and a cookie.
 *
 * GDPR/ePrivacy compliance hinges on TWO things this component enforces:
 *   1. No `tmc_visitor_id` cookie is set until "Accept" is clicked
 *      (see `setConsentStatus` in services/analytics.ts).
 *   2. The user can change their mind — we expose a hook (the floating
 *      "Cookie preferences" link in the footer can call `openConsentGate`
 *      via a window event) so a previously-accepted user can revoke.
 */

import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { getConsentStatus, setConsentStatus } from "@/services/analytics";

type ViewMode = "compact" | "preferences";

/**
 * Render the cookie consent toast. Mount once at the app root — multiple
 * mounts would stack copies of the card.
 */
const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const [view, setView] = useState<ViewMode>("compact");

  // Decide on mount whether to show the gate. We also listen for an
  // explicit re-open event so the footer (or any other UI) can let the
  // user revisit their choice.
  useEffect(() => {
    if (getConsentStatus() === "unknown") {
      // Wait one tick so the toast doesn't fight the LCP image for paint.
      const timeout = window.setTimeout(() => setVisible(true), 600);
      return () => window.clearTimeout(timeout);
    }
    const reopenHandler = () => {
      setView("preferences");
      setVisible(true);
    };
    window.addEventListener("tmc:open-consent", reopenHandler);
    return () => window.removeEventListener("tmc:open-consent", reopenHandler);
  }, []);

  if (!visible) return null;

  /**
   * Persist the user's choice and dismiss the gate. We dispatch a
   * window event so other parts of the app (e.g. the analytics beacon)
   * can react to the new consent state without polling.
   */
  const recordChoice = (choice: "accepted" | "rejected") => {
    setConsentStatus(choice);
    window.dispatchEvent(new CustomEvent("tmc:consent-changed", { detail: { choice } }));
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed bottom-4 right-4 z-[60] w-[calc(100vw-2rem)] max-w-[340px]"
    >
      <div
        className="rounded-xl p-4 backdrop-blur-md"
        style={{
          backgroundColor: "hsl(280 57% 13% / 0.95)",
          border: "1px solid hsl(50 82% 87% / 0.18)",
          boxShadow: "0 20px 50px -10px hsl(280 57% 8% / 0.6)",
          color: "hsl(50 82% 87%)",
        }}
      >
        <div className="flex items-start gap-3">
          <span
            className="inline-flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 mt-0.5"
            style={{ backgroundColor: "hsl(46 75% 55% / 0.18)", color: "hsl(46 75% 70%)" }}
          >
            <Cookie size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              className="font-display text-sm font-bold leading-tight"
              style={{ fontFamily: "'Bricolage Grotesque', 'Unbounded', sans-serif" }}
            >
              {view === "compact" ? "We respect your privacy" : "Choose what you allow"}
            </h2>
            <p className="font-body text-[12px] leading-relaxed mt-1.5" style={{ color: "hsl(50 82% 87% / 0.75)" }}>
              {view === "compact"
                ? "We use a simple cookie to remember how you found us. This helps us understand which of our links are most helpful. We never store personal information without your explicit consent. 😊"
                : "Accept lets us remember you across visits so your form submissions enrich our content insights. Reject keeps every page view fully anonymous — you'll still get the same site."}
            </p>

            {view === "compact" ? (
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => recordChoice("accepted")}
                  className="flex-1 font-display text-[10px] uppercase tracking-[0.15em] font-bold px-3 py-2 rounded-full transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "hsl(46 75% 55%)", color: "hsl(280 57% 13%)" }}
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => setView("preferences")}
                  className="font-body text-[11px] uppercase tracking-wider px-3 py-2 rounded-full transition-opacity hover:opacity-70"
                  style={{ color: "hsl(50 82% 87% / 0.7)" }}
                >
                  Preferences
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => recordChoice("accepted")}
                  className="flex-1 font-display text-[10px] uppercase tracking-[0.15em] font-bold px-3 py-2 rounded-full transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "hsl(46 75% 55%)", color: "hsl(280 57% 13%)" }}
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => recordChoice("rejected")}
                  className="flex-1 font-body text-[11px] uppercase tracking-wider px-3 py-2 rounded-full transition-colors"
                  style={{
                    border: "1px solid hsl(50 82% 87% / 0.25)",
                    color: "hsl(50 82% 87%)",
                  }}
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
