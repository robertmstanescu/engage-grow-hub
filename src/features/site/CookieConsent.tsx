/**
 * CookieConsent — the privacy gate AND the re-openable settings panel.
 * ──────────────────────────────────────────────────────────────────────────
 * Bottom-right floating card, max-width 360px, matching the site's "liquid
 * glass / dark luxury" aesthetic. Three view modes:
 *
 *   "compact"      First-visit Accept | Preferences buttons.
 *   "preferences"  Short explanation + Accept | Reject choices.
 *   "settings"     Detailed panel listing every cookie we set and why,
 *                  plus a toggle that flips between the user's CURRENT
 *                  state (Accepted ↔ Rejected). This view is what opens
 *                  when someone clicks "Cookie Settings" in the footer
 *                  AFTER they have already made a choice.
 *
 * The card never shows by itself once the user has made a decision — only
 * an explicit `tmc:open-consent` window event re-opens it (dispatched by
 * the footer's "Cookie Settings" button — see `src/features/site/Footer.tsx`).
 *
 * GDPR/ePrivacy compliance hinges on TWO things this component enforces:
 *   1. No `tmc_visitor_id` cookie is set until "Accept" is clicked
 *      (see `setConsentStatus` in services/analytics.ts).
 *   2. The user can change their mind at any time via the footer link
 *      → opens the "settings" view → flip the switch → choice persisted.
 */

import { useEffect, useState } from "react";
import { Cookie, X } from "lucide-react";
import { getConsentStatus, setConsentStatus, type ConsentStatus } from "@/services/analytics";

type ViewMode = "compact" | "preferences" | "settings";

/**
 * Static description of every cookie / piece of local state we set when
 * the user accepts. Keep this list in sync with what `services/analytics.ts`
 * actually writes — if you add a new cookie, add a row here too. This is
 * the user-facing source of truth that satisfies the "what do you store
 * and why" requirement under GDPR Article 13.
 */
const COOKIE_INVENTORY: { name: string; purpose: string; lifespan: string }[] = [
  {
    name: "tmc_visitor_id",
    purpose:
      "A randomly generated ID that lets us connect a download or contact form back to the article that brought you to the site, so we can see which content is genuinely useful. It contains no personal information.",
    lifespan: "12 months",
  },
  {
    name: "tmc_consent",
    purpose:
      "Remembers whether you accepted or rejected analytics cookies, so we don't ask you on every visit.",
    lifespan: "12 months",
  },
];

/**
 * Render the cookie consent toast. Mount once at the app root — multiple
 * mounts would stack copies of the card.
 */
const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const [view, setView] = useState<ViewMode>("compact");
  // Track the current persisted choice so the settings panel can show
  // the right "you currently allow / decline" copy and the right toggle
  // direction. We re-read it on every open so the state stays accurate
  // even if another tab changed it.
  const [currentStatus, setCurrentStatus] = useState<ConsentStatus>("unknown");

  // Decide on mount whether to show the gate. We also listen for an
  // explicit re-open event so the footer (or any other UI) can let the
  // user revisit their choice.
  useEffect(() => {
    const status = getConsentStatus();
    setCurrentStatus(status);

    if (status === "unknown") {
      // Wait one tick so the toast doesn't fight the LCP image for paint.
      const timeout = window.setTimeout(() => setVisible(true), 600);
      // We still register the re-open handler in case the user dismisses
      // by ignoring it and later clicks the footer link.
      const reopen = () => {
        setCurrentStatus(getConsentStatus());
        setView("settings");
        setVisible(true);
      };
      window.addEventListener("tmc:open-consent", reopen);
      return () => {
        window.clearTimeout(timeout);
        window.removeEventListener("tmc:open-consent", reopen);
      };
    }

    // Returning user → only the footer re-open hook is wired up.
    const reopen = () => {
      setCurrentStatus(getConsentStatus());
      setView("settings");
      setVisible(true);
    };
    window.addEventListener("tmc:open-consent", reopen);
    return () => window.removeEventListener("tmc:open-consent", reopen);
  }, []);

  if (!visible) return null;

  /**
   * Persist the user's choice and update local state. We do NOT auto-close
   * in the settings view — we want the user to see confirmation that the
   * choice has been saved before they close the panel themselves.
   */
  const recordChoice = (choice: "accepted" | "rejected", autoClose = true) => {
    setConsentStatus(choice);
    setCurrentStatus(choice);
    window.dispatchEvent(new CustomEvent("tmc:consent-changed", { detail: { choice } }));
    if (autoClose) setVisible(false);
  };

  // ────────────────────────────────────────────────────────────────────
  // SETTINGS VIEW — the wider, scrollable panel that opens from the
  // footer "Cookie Settings" button. Shows current status, lists every
  // cookie we set, and exposes a single Switch button that flips the
  // user between accepted ↔ rejected.
  // ────────────────────────────────────────────────────────────────────
  if (view === "settings") {
    const isAccepted = currentStatus === "accepted";
    return (
      <div
        role="dialog"
        aria-label="Cookie settings"
        // Wider than the compact toast (max 420px) so the cookie list is
        // legible without horizontal cramming. Same 26px edge spacing.
        style={{ position: "fixed", bottom: "26px", right: "26px", zIndex: 60 }}
        className="w-[calc(100vw-3.25rem)] max-w-[420px]"
      >
        <div
          className="rounded-xl backdrop-blur-md overflow-hidden"
          style={{
            backgroundColor: "hsl(280 57% 13% / 0.97)",
            border: "1px solid hsl(50 82% 87% / 0.18)",
            boxShadow: "0 20px 50px -10px hsl(280 57% 8% / 0.6)",
            color: "hsl(50 82% 87%)",
          }}
        >
          {/* Header bar with title + close button */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid hsl(50 82% 87% / 0.12)" }}
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-full"
                style={{ backgroundColor: "hsl(46 75% 55% / 0.18)", color: "hsl(46 75% 70%)" }}
              >
                <Cookie size={13} />
              </span>
              <h2
                className="font-display text-sm font-bold"
                style={{ fontFamily: "'Bricolage Grotesque', 'Unbounded', sans-serif" }}
              >
                Cookie Settings
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setVisible(false)}
              aria-label="Close"
              className="opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: "hsl(50 82% 87%)" }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable body. Capped height so the panel never exceeds the
              viewport on small screens — keeps the close button reachable. */}
          <div className="px-4 py-4 max-h-[60vh] overflow-y-auto">
            {/* Current status pill */}
            <div className="mb-3">
              <p className="font-body text-[11px] uppercase tracking-wider opacity-60 mb-1.5">
                Your current preference
              </p>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: isAccepted ? "hsl(140 60% 55%)" : "hsl(0 70% 60%)",
                  }}
                />
                <span className="font-body text-[13px]">
                  {isAccepted
                    ? "Accepted — analytics cookies are active."
                    : currentStatus === "rejected"
                    ? "Rejected — no analytics cookies are set."
                    : "Not yet decided."}
                </span>
              </div>
            </div>

            {/* Plain-English summary */}
            <p
              className="font-body text-[12px] leading-relaxed mb-4"
              style={{ color: "hsl(50 82% 87% / 0.75)" }}
            >
              We use a small number of cookies to understand which of our articles
              actually help people. We never sell your data, never run ad-tracking,
              and never share what we collect with third parties.
            </p>

            {/* Cookie inventory — one card per stored value */}
            <p className="font-body text-[11px] uppercase tracking-wider opacity-60 mb-2">
              What we store when you accept
            </p>
            <ul className="space-y-2.5 mb-4">
              {COOKIE_INVENTORY.map((c) => (
                <li
                  key={c.name}
                  className="rounded-lg p-3"
                  style={{
                    backgroundColor: "hsl(280 30% 18% / 0.5)",
                    border: "1px solid hsl(50 82% 87% / 0.08)",
                  }}
                >
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <code
                      className="font-mono text-[11px]"
                      style={{ color: "hsl(46 75% 70%)" }}
                    >
                      {c.name}
                    </code>
                    <span
                      className="font-body text-[10px] uppercase tracking-wider opacity-50"
                    >
                      {c.lifespan}
                    </span>
                  </div>
                  <p
                    className="font-body text-[12px] leading-relaxed"
                    style={{ color: "hsl(50 82% 87% / 0.75)" }}
                  >
                    {c.purpose}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer action — flips the choice. Label changes based on
              current state so the consequence of clicking is obvious. */}
          <div
            className="px-4 py-3 flex items-center gap-2"
            style={{ borderTop: "1px solid hsl(50 82% 87% / 0.12)" }}
          >
            {isAccepted ? (
              <button
                type="button"
                onClick={() => recordChoice("rejected", false)}
                className="flex-1 font-body text-[11px] uppercase tracking-wider px-3 py-2 rounded-full transition-colors"
                style={{
                  border: "1px solid hsl(50 82% 87% / 0.25)",
                  color: "hsl(50 82% 87%)",
                }}
              >
                Withdraw consent
              </button>
            ) : (
              <button
                type="button"
                onClick={() => recordChoice("accepted", false)}
                className="flex-1 font-display text-[10px] uppercase tracking-[0.15em] font-bold px-3 py-2 rounded-full transition-opacity hover:opacity-90"
                style={{ backgroundColor: "hsl(46 75% 55%)", color: "hsl(280 57% 13%)" }}
              >
                {currentStatus === "rejected" ? "Accept cookies" : "Accept cookies"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setVisible(false)}
              className="font-body text-[11px] uppercase tracking-wider px-3 py-2 rounded-full transition-opacity hover:opacity-70"
              style={{ color: "hsl(50 82% 87% / 0.7)" }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────
  // COMPACT / PREFERENCES VIEWS — original first-visit gate, unchanged.
  // ────────────────────────────────────────────────────────────────────
  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      style={{ position: "fixed", bottom: "26px", right: "26px", zIndex: 60 }}
      className="w-[calc(100vw-3.25rem)] max-w-[340px]"
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
