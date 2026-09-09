/**
 * analyticsGuards — who and where we do NOT count.
 *
 * Three guards, all decided in the browser before a beacon leaves:
 *
 *  1. Host: only the production site records traffic. Previews inside
 *     Lovable run on lovableproject.com / lovable.app, the dev server on
 *     localhost; those pages used to beacon like real visits and showed
 *     up as "traffic from Lovable".
 *  2. "Exclude this device": a flag in localStorage, set from Insights.
 *     No address needed; it works logged out and on any path. (Same idea
 *     as Plausible's `plausible_ignore`.)
 *  3. Automation signals: `navigator.webdriver`, a missing language, or
 *     a zero-sized screen mark a scripted browser. These are SENT with the
 *     beacon so the server can classify; nothing is decided from them here.
 */

export const PRODUCTION_HOSTS = ["themagiccoffin.com", "www.themagiccoffin.com"];
export const IGNORE_KEY = "tmc_ignore";

/** True when this hostname belongs to the live site. */
export const isTrackableHost = (hostname: string, allowed: string[] = PRODUCTION_HOSTS): boolean =>
  allowed.includes(hostname.toLowerCase());

/** Hosts we recognise as our own previews, checked again on the server. */
export const isPreviewHost = (host: string): boolean =>
  /(^|\.)lovable\.(dev|app)$|(^|\.)lovableproject\.com$|^localhost(:\d+)?$|^127\.0\.0\.1(:\d+)?$/i.test(host.toLowerCase());

export const isDeviceExcluded = (): boolean => {
  try { return window.localStorage.getItem(IGNORE_KEY) === "1"; } catch { return false; }
};

export const setDeviceExcluded = (excluded: boolean): void => {
  try {
    if (excluded) window.localStorage.setItem(IGNORE_KEY, "1");
    else window.localStorage.removeItem(IGNORE_KEY);
  } catch { /* storage blocked: nothing to remember */ }
};

export interface ClientSignals {
  webdriver: boolean;
  language: string;
  screen: [number, number];
  timezone: string;
}

export const collectSignals = (): ClientSignals => {
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  let timezone = "";
  try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { /* old engines */ }
  return {
    webdriver: !!nav && (nav as Navigator & { webdriver?: boolean }).webdriver === true,
    language: nav?.language || "",
    screen: typeof window !== "undefined" ? [window.screen?.width || 0, window.screen?.height || 0] : [0, 0],
    timezone,
  };
};
