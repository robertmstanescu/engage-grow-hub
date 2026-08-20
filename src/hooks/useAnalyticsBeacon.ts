import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  detectSearchEngine,
  getConsentStatus,
  getStableVisitorId,
  parseUserAgentForAnalytics,
} from "@/services/analytics";
import { captureAttribution, getAttributionForPayload } from "@/services/attribution";
import { useAdminStatus } from "@/hooks/useAdminStatus";

/**
 * useAnalyticsBeacon — fires one beacon per route change.
 * ──────────────────────────────────────────────────────────────────────────
 * Logs BOTH humans and bots:
 *
 *   - Bots: every hit (the edge function uses the request UA to identify them).
 *   - Humans: every page view sends path + parsed UA + referrer; the edge
 *     function adds country (from CF-IPCountry) and writes the row.
 *
 * The persistent `mh_visitor_id` (random UUID, localStorage) is sent on
 * EVERY beacon so `countUniqueHumanVisitors` can dedup correctly across
 * IP changes (mobile carriers, NATs, VPNs). This id is anonymous and is
 * NOT gated by GDPR consent — it identifies a browser, not a person.
 *
 * The consent-gated `tmc_visitor_id` cookie remains separate and powers
 * email→visitor stitching for the Path-to-Lead feature.
 *
 * Marketing attribution (Epic 4 / US 4.1) — captureAttribution() runs
 * BEFORE the admin-route guard so an inbound paid click that happens to
 * land on /admin?utm_…=… (e.g. an internal QA link) still seeds
 * localStorage, PROVIDED consent has actually been accepted (see below).
 * The captured blob is then attached to every analytics beacon so
 * downstream dashboards can attribute revenue to campaigns.
 *
 * WHY ATTRIBUTION CAPTURE IS CONSENT-GATED BUT THE PLAIN BEACON ISN'T —
 * a UTM/GCLID/FBCLID is a tracking identifier tied to an ad platform
 * (Google/Meta can correlate it back to a specific ad click), which is
 * squarely what GDPR/ePrivacy consent requirements are about. The plain
 * pageview beacon carries no such identifier — just a path, device/
 * browser class and the anonymous `mh_visitor_id` (see the note below) —
 * so it stays on for aggregate traffic counts regardless of consent, the
 * same way a server access log would. Only capture is gated: it only
 * ever runs once consent is "accepted", and a reject/withdraw wipes
 * whatever was already captured (see `setConsentStatus` in
 * services/analytics.ts) so a visitor who accepts, gets attributed, then
 * later withdraws isn't still carrying that campaign data around.
 *
 * ADMIN SELF-TRAFFIC — the /admin path-prefix check below only filters
 * the admin PANEL itself. It does nothing for an admin's own visits to
 * PUBLIC pages — e.g. the "Open page" preview links in AdminInsights.tsx
 * open /p/:slug or /blog/:slug in a new tab, which shares this browser's
 * Supabase session. Without a session check, every one of those clicks
 * would get counted as real visitor traffic. `useAdminStatus()` reads
 * the same session Supabase already persists in localStorage (no extra
 * network round-trip for the common case of an anonymous visitor with no
 * session at all), so this beacon skips entirely for a logged-in admin,
 * on ANY path — not just /admin ones.
 *
 * Failure is non-fatal: if the analytics edge function is down, the page
 * still loads. The beacon is wrapped in try/catch and explicitly does
 * NOT block any user-visible work.
 */
export function useAnalyticsBeacon(): void {
  const { pathname } = useLocation();
  const { isAdmin, loading: adminStatusLoading } = useAdminStatus();
  // Track the last logged path to deduplicate StrictMode double-effects.
  const lastLoggedRef = useRef<string | null>(null);
  // Re-read on every mount; kept as state (not a plain read inside the
  // effect) so the CookieConsent panel's "tmc:consent-changed" event can
  // unlock capture immediately when someone accepts mid-session, without
  // requiring a route change to re-run the effect.
  // Named to avoid colliding, even just visually, with services/analytics.ts's
  // exported `setConsentStatus` (which writes the user's choice) — this
  // setter only updates this component's own local mirror of it.
  const [consentStatus, setLocalConsentStatus] = useState(getConsentStatus);

  useEffect(() => {
    const onConsentChanged = () => setLocalConsentStatus(getConsentStatus());
    window.addEventListener("tmc:consent-changed", onConsentChanged);
    return () => window.removeEventListener("tmc:consent-changed", onConsentChanged);
  }, []);

  useEffect(() => {
    // Capture attribution FIRST — must run even on /admin routes so an
    // inbound campaign URL (?utm_…) is still recorded if it happens to
    // land there, PROVIDED the visitor has actually accepted (see the
    // file header for why this specific piece is gated). Idempotent:
    // only writes when there are new params or nothing was stored yet.
    if (consentStatus === "accepted") captureAttribution();

    // Admin routes are noise — the table would explode with our own clicks.
    if (pathname.startsWith("/admin")) return;
    // Wait for the session check to resolve before beaconing (it's fast —
    // see note above), then skip entirely for a logged-in admin. This
    // re-runs when adminStatusLoading flips to false, so the FIRST
    // pageview of an admin session is caught too, not just subsequent
    // ones.
    if (adminStatusLoading) return;
    if (isAdmin) return;
    if (lastLoggedRef.current === pathname) return;
    lastLoggedRef.current = pathname;

    // Build the beacon body. The edge function handles country detection
    // and bot identification authoritatively; everything we send here is
    // either device data only the browser knows, or pure metadata.
    const { browser, device } = parseUserAgentForAnalytics();
    const referrer = typeof document !== "undefined" ? document.referrer || "" : "";
    // Always send the stable visitor id — it's our PRIMARY dedup key on
    // the server. See src/services/analytics.ts for the rationale.
    const visitorId = getStableVisitorId();
    // Snapshot of whatever we currently know about this visitor's
    // marketing source. May be null for direct/organic traffic that
    // arrived before the capture utility existed.
    const attribution = getAttributionForPayload();

    const body = {
      pagePath: pathname,
      browser,
      device,
      referrer,
      searchEngine: detectSearchEngine(referrer),
      visitorId,
      attribution,
    };

    // Fire-and-forget. We do not await — page interactivity matters more
    // than the beacon's latency. Analytics is strictly non-critical:
    // transient 5xx (edge runtime cold starts, brief outages) must NEVER
    // surface as console errors or unhandled rejections, otherwise the
    // dev overlay flags them as runtime errors and breaks the preview.
    // We swallow ALL failures silently — the next route change will
    // try again, and missing a beacon has zero user-facing impact.
    try {
      const result = supabase.functions.invoke("track-visitor", { body });
      // Some SDK versions return a thenable that rejects; guard both.
      if (result && typeof (result as Promise<unknown>).then === "function") {
        (result as Promise<unknown>).then(
          () => {},
          () => {},
        );
      }
    } catch {
      // Synchronous throw (extremely rare) — also silent.
    }
  }, [pathname, isAdmin, adminStatusLoading, consentStatus]);
}
