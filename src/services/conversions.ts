/**
 * conversions.ts — fires the marketing pixels' conversion events at the
 * moment a visitor actually converts, not just when they view a page.
 *
 * Before this, GA4/Meta only ever received automatic pageview events
 * (from `usePageMeta`'s `injectGlobalScripts`) — a paid campaign's
 * bidding algorithm had zero signal to tell a converting visitor from
 * a bounce, which is usually the single biggest lever on wasted ad
 * spend. This file is the one place that closes that gap; every real
 * conversion moment in the app should call `trackConversion` here
 * rather than hand-rolling its own `gtag`/`fbq` call.
 *
 * Every call is a safe no-op if a given pixel was never loaded (tag not
 * configured in Admin -> SEO -> Global Metadata, or the visitor blocks
 * trackers) — `window.gtag`/`window.fbq` only exist once
 * `injectGlobalScripts` has actually injected that vendor's snippet.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export type ConversionKind =
  | "contact_form"
  | "newsletter_signup"
  | "lead_magnet_download"
  | "cta_click";

/** GA4's own recommended event names — see Google's "recommended events" reference. */
const GA4_EVENT: Record<ConversionKind, string> = {
  contact_form: "generate_lead",
  newsletter_signup: "sign_up",
  lead_magnet_download: "generate_lead",
  cta_click: "select_content",
};

/**
 * Meta's standard event taxonomy — chosen for what each moment actually
 * IS, not overclaimed. `cta_click` deliberately has no standard-event
 * mapping: a generic card CTA can point anywhere (an external booking
 * page, an internal link, a PDF), so we can't honestly assert "Contact"
 * or "Schedule" happened — it's tracked as a custom event instead.
 */
const META_STANDARD_EVENT: Partial<Record<ConversionKind, string>> = {
  contact_form: "Contact",
  newsletter_signup: "CompleteRegistration",
  lead_magnet_download: "Lead",
};

/**
 * Report a conversion to every configured ad/analytics pixel.
 * @param kind Which conversion moment this is.
 * @param label Optional human-readable context (e.g. the CTA's own
 *   label, or which lead magnet was downloaded) — surfaces in GA4/Meta
 *   reporting so multiple CTAs/magnets aren't lumped into one number.
 */
export const trackConversion = (kind: ConversionKind, label?: string): void => {
  if (typeof window === "undefined") return;

  try {
    window.gtag?.("event", GA4_EVENT[kind], {
      method: kind,
      ...(label ? { content_id: label } : {}),
    });
  } catch {
    /* Never let a broken/blocked pixel affect the actual conversion flow. */
  }

  try {
    const standardEvent = META_STANDARD_EVENT[kind];
    if (standardEvent) {
      window.fbq?.("track", standardEvent, label ? { content_name: label } : undefined);
    } else {
      window.fbq?.("trackCustom", "CtaClick", label ? { label } : undefined);
    }
  } catch {
    /* Never let a broken/blocked pixel affect the actual conversion flow. */
  }
};
