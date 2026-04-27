import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  detectSearchEngine,
  getStableVisitorId,
  parseUserAgentForAnalytics,
} from "@/services/analytics";
import { captureAttribution, getAttributionForPayload } from "@/services/attribution";

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
 * localStorage. The captured blob is then attached to every analytics
 * beacon so downstream dashboards can attribute revenue to campaigns.
 *
 * Failure is non-fatal: if the analytics edge function is down, the page
 * still loads. The beacon is wrapped in try/catch and explicitly does
 * NOT block any user-visible work.
 */
export function useAnalyticsBeacon(): void {
  const { pathname } = useLocation();
  // Track the last logged path to deduplicate StrictMode double-effects.
  const lastLoggedRef = useRef<string | null>(null);

  useEffect(() => {
    // Capture attribution FIRST — must run even on /admin routes so an
    // inbound campaign URL (?utm_…) is still recorded if it happens to
    // land there. Idempotent: only writes when there are new params or
    // nothing was stored yet.
    captureAttribution();

    // Admin routes are noise — the table would explode with our own clicks.
    if (pathname.startsWith("/admin")) return;
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
  }, [pathname]);
}
