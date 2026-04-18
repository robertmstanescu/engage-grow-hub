import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Sends a one-time-per-route beacon to the `track-ai-crawler` Edge
 * Function. The function inspects the request's User-Agent (NOT anything
 * we send from the client) and logs it if it matches a known AI bot.
 *
 * Why we even bother with a client beacon when the server's `llms-txt`
 * function already logs:
 *   Some AI crawlers (Googlebot, Applebot, etc.) DO render JavaScript and
 *   crawl arbitrary pages — they wouldn't necessarily hit /llms.txt. This
 *   beacon catches them on whatever page they actually loaded.
 *
 * Why this is safe / not an analytics privacy nightmare:
 *   The Edge Function returns early without inserting anything if the UA
 *   does not match a known bot pattern. Real users never hit the database.
 */
export function useAiCrawlerBeacon(): void {
  const { pathname } = useLocation();

  useEffect(() => {
    // Skip admin routes — bots shouldn't see them, and we don't need the noise.
    if (pathname.startsWith("/admin")) return;

    // Cheap UA pre-check: most users aren't bots, so skip the network call.
    // The Edge Function repeats this check authoritatively.
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const looksLikeBot = /bot|crawler|spider|GPT|Claude|Perplexity|Applebot|Googlebot|Grok|xAI|Bytespider/i
      .test(userAgent);
    if (!looksLikeBot) return;

    // Fire-and-forget. We don't care about the response.
    supabase.functions
      .invoke("track-ai-crawler", { body: { pagePath: pathname } })
      .catch((beaconError) => {
        // Beacon failures must never affect the page.
        console.warn("AI crawler beacon failed:", beaconError);
      });
  }, [pathname]);
}
