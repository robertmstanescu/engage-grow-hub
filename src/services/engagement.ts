/**
 * engagement — how long a page was actually in front of someone, and
 * how far down they got.
 *
 * Seconds count only while the tab is visible (Page Visibility API), so
 * a forgotten tab does not become a twenty-minute read. Scroll depth is
 * the deepest point reached, as a percentage of the page. Any pointer,
 * key, touch or scroll flips `interacted`.
 *
 * `flush()` reports the totals so far; it is called when the tab goes
 * hidden, on pagehide, and when the route changes. Totals are cumulative,
 * so the server keeps the greatest value it has seen for a view.
 */

export interface EngagementSnapshot {
  seconds: number;
  scrollDepth: number;
  interacted: boolean;
}

export interface EngagementTracker {
  snapshot: () => EngagementSnapshot;
  /** Stop listening; returns the final snapshot. */
  stop: () => EngagementSnapshot;
}

const depthNow = (): number => {
  if (typeof document === "undefined") return 0;
  const doc = document.documentElement;
  const total = Math.max(doc.scrollHeight, document.body?.scrollHeight || 0);
  const viewport = window.innerHeight || doc.clientHeight;
  if (total <= viewport) return 100;
  const reached = (window.scrollY || doc.scrollTop || 0) + viewport;
  return Math.max(0, Math.min(100, Math.round((reached / total) * 100)));
};

export const startEngagement = (now: () => number = () => Date.now()): EngagementTracker => {
  let visibleSince: number | null = document.visibilityState === "visible" ? now() : null;
  let accumulated = 0;
  let scrollDepth = depthNow();
  let interacted = false;
  let raf = 0;

  const settle = () => {
    if (visibleSince !== null) { accumulated += now() - visibleSince; visibleSince = now(); }
  };
  const onVisibility = () => {
    if (document.visibilityState === "visible") { if (visibleSince === null) visibleSince = now(); }
    else { settle(); visibleSince = null; }
  };
  const onScroll = () => {
    interacted = true;
    if (raf) return;
    raf = window.requestAnimationFrame(() => { raf = 0; scrollDepth = Math.max(scrollDepth, depthNow()); });
  };
  const onInteract = () => { interacted = true; };

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("pointerdown", onInteract, { passive: true });
  window.addEventListener("keydown", onInteract);
  window.addEventListener("touchstart", onInteract, { passive: true });

  const snapshot = (): EngagementSnapshot => {
    settle();
    return { seconds: Math.round(accumulated / 1000), scrollDepth: Math.max(scrollDepth, depthNow()), interacted };
  };
  const stop = () => {
    const s = snapshot();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("pointerdown", onInteract);
    window.removeEventListener("keydown", onInteract);
    window.removeEventListener("touchstart", onInteract);
    if (raf) window.cancelAnimationFrame(raf);
    return s;
  };
  return { snapshot, stop };
};

/**
 * Send a small JSON body so it survives the page going away.
 * `text/plain` keeps the beacon CORS-safelisted (a JSON content type would
 * need a preflight that an unloading page cannot wait for); the function
 * parses the body regardless of the header.
 */
export const sendBeaconJson = (url: string, body: unknown): boolean => {
  const payload = JSON.stringify(body);
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      if (navigator.sendBeacon(url, new Blob([payload], { type: "text/plain;charset=UTF-8" }))) return true;
    }
  } catch { /* fall through */ }
  try {
    void fetch(url, { method: "POST", body: payload, keepalive: true, headers: { "Content-Type": "text/plain;charset=UTF-8" } }).catch(() => {});
    return true;
  } catch { return false; }
};
