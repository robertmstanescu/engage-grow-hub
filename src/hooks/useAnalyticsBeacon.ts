import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  detectSearchEngine,
  getStableVisitorId,
  parseUserAgentForAnalytics,
} from "@/services/analytics";

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
 * Failure is non-fatal: if the analytics edge function is down, the page
 * still loads. The beacon is wrapped in try/catch and explicitly does
 * NOT block any user-visible work.
 */
export function useAnalyticsBeacon(): void {
  const { pathname } = useLocation();
  // Track the last logged path to deduplicate StrictMode double-effects.
  const lastLoggedRef = useRef<string | null>(null);

  useEffect(() => {
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

    const body = {
      pagePath: pathname,
      browser,
      device,
      referrer,
      searchEngine: detectSearchEngine(referrer),
      visitorId,
    };

    // Fire-and-forget. We do not await — page interactivity matters more
    // than the beacon's latency. Errors are caught so they cannot throw
    // out of the React effect.
    supabase.functions.invoke("track-visitor", { body }).catch((beaconError) => {
      // Telemetry failure is logged at warn level but never surfaced.
      console.warn("Analytics beacon failed:", beaconError);
    });
  }, [pathname]);
}
