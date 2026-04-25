/**
 * Marketing attribution — Epic 4 / US 4.1
 * ───────────────────────────────────────────────────────────────────────
 *
 * Captures the URL parameters that ad networks attach to inbound clicks
 * (UTMs, GCLID, FBCLID) on the user's FIRST landing on the site, then
 * persists them in `localStorage` so they survive across sessions and
 * are still available days later when the user finally fills in a form.
 *
 * Why first-touch (not last-touch)?
 * ──────────────────────────────────
 * Strategy doc: "even if the user clicked around the site for days
 * before converting" — the campaign that EARNED the click is what we
 * want to credit, not whatever URL they happened to be on when they
 * pressed Submit. Ads are paid for once, on the click; subsequent
 * internal navigations should not overwrite the source of truth.
 *
 * However: if the user comes back via a NEW paid click (different UTM /
 * GCLID), that's a legitimate new touchpoint and SHOULD overwrite the
 * stored attribution. The code below detects this by checking whether
 * the current URL carries any tracking params at all.
 *
 * Storage shape — kept flat for downstream JSONB queries:
 *   {
 *     utm_source, utm_medium, utm_campaign, utm_term, utm_content,
 *     gclid, fbclid,
 *     landing_path,   // pathname on first capture
 *     referrer,       // document.referrer on first capture
 *     first_seen_at,  // ISO timestamp
 *   }
 *
 * Anything `null` / missing is omitted from the blob — the JSONB column
 * stays sparse so dashboards can `WHERE attribution ? 'gclid'`.
 */

const STORAGE_KEY = "tmc_attribution";

/**
 * Tracking-param keys we recognise on inbound URLs. Order matters only
 * for readability; nothing here is positional.
 *
 * If you add a new ad network (msclkid for Bing, ttclid for TikTok, …)
 * just append it here — no other code changes needed because the
 * `attribution` column is JSONB.
 */
const TRACKED_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
] as const;

export type AttributionKey = (typeof TRACKED_PARAMS)[number];

export interface AttributionRecord {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  landing_path?: string;
  referrer?: string;
  first_seen_at?: string;
}

/* ─────────────────────────────────────────────────────────────────── */

/**
 * Read whatever's currently in `localStorage`. Returns `null` if the
 * blob is absent or unparseable (we treat malformed JSON as "no data"
 * rather than blowing up — attribution is best-effort).
 */
export const getAttribution = (): AttributionRecord | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as AttributionRecord;
  } catch {
    return null;
  }
};

/**
 * Truncate untrusted strings to a sane length before persisting. UTMs
 * are usually <100 chars but we've all seen the 4KB tracking blobs.
 */
const clip = (v: string, max = 256) => (v.length > max ? v.slice(0, max) : v);

/**
 * Pull tracking params out of the *current* `window.location`. Returns
 * an empty object when none are present (which is the normal case for
 * organic / direct traffic).
 */
const readParamsFromUrl = (): Partial<AttributionRecord> => {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const out: Partial<AttributionRecord> = {};
  for (const key of TRACKED_PARAMS) {
    const v = params.get(key);
    if (v && v.trim() !== "") out[key] = clip(v.trim());
  }
  return out;
};

/**
 * Capture attribution on first load. Idempotent: safe to call from a
 * `useEffect` that runs on every route change — it only writes when
 * the URL actually carries new tracking params (or on the very first
 * visit, even with a "clean" URL, so we still record the landing path).
 *
 * Returns the resulting attribution blob (or `null` if nothing was
 * worth persisting).
 */
export const captureAttribution = (): AttributionRecord | null => {
  if (typeof window === "undefined") return null;

  const existing = getAttribution();
  const fresh = readParamsFromUrl();
  const hasNewTrackingParams = Object.keys(fresh).length > 0;

  // Case 1: there are tracking params on this URL → ALWAYS overwrite.
  // A new paid click is the strongest possible attribution signal and
  // beats any stale localStorage from a previous campaign.
  if (hasNewTrackingParams) {
    const blob: AttributionRecord = {
      ...fresh,
      landing_path: clip(window.location.pathname || "/", 500),
      referrer: clip((typeof document !== "undefined" && document.referrer) || "", 500) || undefined,
      first_seen_at: new Date().toISOString(),
    };
    // Drop empty-string keys so JSONB stays sparse.
    for (const k of Object.keys(blob) as (keyof AttributionRecord)[]) {
      if (blob[k] === "" || blob[k] === undefined) delete blob[k];
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
    } catch {
      // Quota / disabled storage. Attribution is best-effort.
    }
    return blob;
  }

  // Case 2: no tracking params and we already have something → keep it.
  if (existing) return existing;

  // Case 3: no tracking params and nothing stored. Record the bare
  // landing context so downstream code can still tell ORGANIC traffic
  // ("they came in on /blog/foo with no UTMs") apart from "we never
  // captured anything" (`getAttribution() === null`).
  const blob: AttributionRecord = {
    landing_path: clip(window.location.pathname || "/", 500),
    referrer:
      clip((typeof document !== "undefined" && document.referrer) || "", 500) || undefined,
    first_seen_at: new Date().toISOString(),
  };
  if (!blob.referrer) delete blob.referrer;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
  } catch {
    /* best-effort */
  }
  return blob;
};

/**
 * Convenience helper for outbound payloads. Returns the stored blob
 * unchanged, or `null` if nothing was ever captured. Edge functions
 * accept either shape.
 *
 * Use this from form submitters and the analytics beacon so every
 * server-side write carries the same attribution snapshot.
 */
export const getAttributionForPayload = (): AttributionRecord | null => {
  const attr = getAttribution();
  if (!attr) return null;
  // Return a shallow copy so callers can't mutate the cached blob.
  return { ...attr };
};
