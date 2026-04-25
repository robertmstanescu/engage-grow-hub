import { useEffect } from "react";

/* ════════════════════════════════════════════════════════════════════
 * useUnloadGuard — Debug Story 4.2
 * ════════════════════════════════════════════════════════════════════
 *
 * Native `beforeunload` guard. When `enabled` is true, the browser
 * shows its standard "Leave site? Changes you made may not be saved."
 * dialog before the user reloads, closes, or navigates away from the
 * tab.
 *
 * WHY a hook (and not a one-off useEffect at the call site)
 * ──────────────────────────────────────────────────────────
 *  • Centralises the (slightly fiddly) browser quirks: the listener
 *    MUST set both `event.preventDefault()` AND `event.returnValue`
 *    on a cancelable event, and modern browsers ignore custom message
 *    strings — we use a sensible default but the prompt copy is
 *    chosen by the browser.
 *  • The handler is re-bound every time `enabled` flips, and torn
 *    down on unmount, so we never leave a stale listener that fires
 *    on a clean tab.
 *
 * IMPORTANT — what this does NOT cover
 * ────────────────────────────────────
 *  • SPA navigations via `react-router` (clicking an in-app `<Link>`)
 *    do not trigger `beforeunload`. The router has to be intercepted
 *    separately if/when we need to guard those flows. The QA spec
 *    here explicitly tests reload + browser back, both of which
 *    trigger `beforeunload`, so this hook is sufficient.
 *  • The browser will only honour the prompt after a user interaction
 *    on the page. That's a Chromium / Firefox security policy, not
 *    something we control — and it matches the QA story (the user
 *    has just edited a row, so they have interacted).
 * ════════════════════════════════════════════════════════════════════ */
export const useUnloadGuard = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return;

    const handler = (event: BeforeUnloadEvent) => {
      // Required for the native prompt to appear in modern browsers.
      // Chromium uses `preventDefault()`; some legacy stacks still
      // rely on `returnValue` — set both to be safe.
      event.preventDefault();
      // The string is ignored by modern browsers (they show their own
      // localised copy), but it must be truthy.
      event.returnValue =
        "You have unsaved changes. Are you sure you want to leave this page?";
      return event.returnValue;
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [enabled]);
};
