/**
 * Unified analytics — client-side helpers.
 * ──────────────────────────────────────────────────────────────────────────
 * Two layers of consent:
 *
 *   Anonymous-by-default
 *     Every page view fires a beacon to `track-visitor` carrying ONLY:
 *       - the path
 *       - the parsed device/browser (from navigator.userAgent on the client)
 *       - the referrer
 *     The edge function adds country (from CF-IPCountry) and writes a row
 *     with NO `visitor_id`. We cannot stitch these to a person — they're
 *     pure aggregate counts. GDPR-safe because nothing identifies anyone.
 *
 *   Consented (after the user clicks "Accept" in the cookie gate)
 *     A persistent `tmc_visitor_id` cookie is created (12-month TTL,
 *     SameSite=Lax). All future beacons include this ID. When the user
 *     later submits a lead form, the visitor_id is sent along so the
 *     server can stitch all their prior anonymous-while-consented rows
 *     to their email — that's the "Path to Lead" feature.
 *
 * Localisation note: the consent flag itself is stored in localStorage
 * because a tiny "did you click yes?" boolean is functional, not tracking.
 * The visitor_id IS tracking and lives in a cookie that we only set on
 * Accept.
 */

const CONSENT_STORAGE_KEY = "tmc_analytics_consent_v1";
const VISITOR_COOKIE_NAME = "tmc_visitor_id";
const VISITOR_COOKIE_TTL_DAYS = 365;

export type ConsentStatus = "unknown" | "accepted" | "rejected";

/**
 * Read the user's consent decision from localStorage. Returns "unknown"
 * when they haven't seen the gate yet — that's the cue to show it.
 */
export function getConsentStatus(): ConsentStatus {
  if (typeof window === "undefined") return "unknown";
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (raw === "accepted" || raw === "rejected") return raw;
    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Persist the user's consent decision. When they accept, also mint the
 * visitor_id cookie immediately so the very next beacon can use it.
 *
 * @param status - "accepted" enables session stitching, "rejected" keeps things anonymous
 */
export function setConsentStatus(status: "accepted" | "rejected"): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, status);
  } catch {
    /* private mode — ignore */
  }
  if (status === "accepted") {
    ensureVisitorIdCookie();
  } else {
    clearVisitorIdCookie();
  }
}

/**
 * Get-or-create the visitor_id cookie. Idempotent — safe to call on
 * every page view after consent. Returns `null` when no cookie exists
 * AND no consent has been granted (the caller should NOT mint one).
 */
export function getVisitorId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${VISITOR_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Mint a visitor_id cookie if one doesn't exist. Only call this AFTER
 * the user has clicked "Accept" — calling it without consent would
 * defeat the privacy gate.
 */
function ensureVisitorIdCookie(): void {
  if (getVisitorId()) return;
  const newId = generateRandomVisitorId();
  const expires = new Date(Date.now() + VISITOR_COOKIE_TTL_DAYS * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie =
    `${VISITOR_COOKIE_NAME}=${encodeURIComponent(newId)};` +
    ` Expires=${expires}; Path=/; SameSite=Lax`;
}

/**
 * Wipe the visitor_id cookie. Used when the user clicks "Reject" after
 * having previously accepted — they get a fresh anonymous slate.
 */
function clearVisitorIdCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${VISITOR_COOKIE_NAME}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax`;
}

/**
 * Generate a 16-char base36 visitor identifier. We don't need uuids —
 * the only requirement is "extremely unlikely to collide across our
 * userbase". This is also nicer to read in the database.
 */
function generateRandomVisitorId(): string {
  const random = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(random, (byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, 16);
}

/**
 * Parse the browser's User-Agent string into coarse buckets for analytics.
 * We intentionally do NOT use a heavy library like ua-parser-js — the
 * dashboard only cares about Chrome/Safari/Firefox/Edge and Mobile/Tablet/Desktop.
 *
 * @returns `{ browser, device }` strings safe to store in the analytics table.
 */
export function parseUserAgentForAnalytics(): { browser: string; device: string } {
  if (typeof navigator === "undefined") return { browser: "Unknown", device: "Unknown" };
  const userAgentString = navigator.userAgent || "";

  // Browser detection — order matters (Edge contains "Chrome", Chrome contains "Safari").
  let browser = "Other";
  if (/Edg\//i.test(userAgentString)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(userAgentString)) browser = "Opera";
  else if (/Firefox/i.test(userAgentString)) browser = "Firefox";
  else if (/Chrome/i.test(userAgentString) && !/Edg\//i.test(userAgentString)) browser = "Chrome";
  else if (/Safari/i.test(userAgentString) && !/Chrome/i.test(userAgentString)) browser = "Safari";

  // Device detection — coarse on purpose. iPad is a tablet even though
  // modern iPadOS sometimes lies and reports MacOS.
  let device = "Desktop";
  if (/iPad|Tablet/i.test(userAgentString)) device = "Tablet";
  else if (/Mobi|Android|iPhone|iPod/i.test(userAgentString)) device = "Mobile";

  return { browser, device };
}

/**
 * Classify the referrer string into a human-readable search engine name,
 * or `null` if it isn't a search engine. The dashboard uses this to
 * populate "How did people find us?".
 */
export function detectSearchEngine(referrerUrl: string): string | null {
  if (!referrerUrl) return null;
  try {
    const host = new URL(referrerUrl).hostname.toLowerCase();
    if (host.includes("google.")) return "Google";
    if (host.includes("bing.")) return "Bing";
    if (host.includes("duckduckgo.")) return "DuckDuckGo";
    if (host.includes("yahoo.")) return "Yahoo";
    if (host.includes("brave.")) return "Brave";
    if (host.includes("ecosia.")) return "Ecosia";
    if (host.includes("yandex.")) return "Yandex";
    if (host.includes("baidu.")) return "Baidu";
    if (host.includes("perplexity.ai")) return "Perplexity";
    if (host.includes("chat.openai.com") || host.includes("chatgpt.com")) return "ChatGPT";
    return null;
  } catch {
    return null;
  }
}

/**
 * Classify the path into one of the dashboard's content categories.
 * Centralised so /llms.txt logging and route logging agree.
 */
export function classifyPathCategory(path: string): "blog" | "page" | "manifest" | "other" {
  if (path.startsWith("/blog/")) return "blog";
  if (path.startsWith("/p/")) return "page";
  if (path === "/llms.txt" || path === "/llms-full.txt") return "manifest";
  return "other";
}
