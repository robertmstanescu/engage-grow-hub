import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { fetchPublicSiteContentValue } from "@/services/publicSiteContent";
import { fetchBrandIdentity } from "@/hooks/useBrandSettings";

/**
 * Resolve the canonical origin for outbound links / meta tags. We
 * prefer the brand-settings value an admin has configured; if absent
 * we fall back to the current `window.location.origin` so links still
 * work in any environment (preview, custom domain, lovable.app).
 */
const resolveCanonicalOrigin = (configured: string | undefined): string => {
  const trimmed = (configured || "").trim().replace(/\/+$/, "");
  if (trimmed) return trimmed;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
};

const ensureTrailingSlash = (path: string) =>
  path.endsWith("/") ? path : `${path}/`;

interface PageMetaProps {
  title?: string;
  description?: string;
  ogImage?: string;
  suffix?: string;
}

/* ─────────────────────────────────────────────────────────────────────
   GLOBAL HEAD INJECTOR
   ─────────────────────────────────────────────────────────────────────
   Loads the `global_seo_tags` row from site_content ONCE per session and
   programmatically appends the official tracking snippets to <head>.
   We tag every injected element with `data-mc-injected` so the cleanup
   path (and HMR) doesn't accumulate duplicates.
   ───────────────────────────────────────────────────────────────────── */

interface GlobalTags {
  social_prefix?: string;
  tracking?: { ga4?: string; meta_pixel?: string; linkedin_partner?: string };
  organization?: { legal_name?: string; type?: string; social_links?: string[] };
  json_ld_organization?: string;
  custom_head_scripts?: string;
}

let globalTagsCache: GlobalTags | null = null;
let globalTagsPromise: Promise<GlobalTags> | null = null;
let scriptsInjected = false;

const loadGlobalTags = (): Promise<GlobalTags> => {
  if (globalTagsCache) return Promise.resolve(globalTagsCache);
  if (globalTagsPromise) return globalTagsPromise;
  globalTagsPromise = (async () => {
    try {
      const content = await fetchPublicSiteContentValue<GlobalTags>("global_seo_tags");
      globalTagsCache = content || {};
      return globalTagsCache;
    } catch {
      globalTagsCache = {};
      return {};
    }
  })();
  return globalTagsPromise;
};

const injectScript = (id: string, attrs: Record<string, string>, body?: string) => {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.setAttribute("data-mc-injected", "true");
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  if (body) s.text = body;
  document.head.appendChild(s);
};

const injectGlobalScripts = (tags: GlobalTags, canonicalOrigin: string) => {
  if (scriptsInjected) return;
  scriptsInjected = true;

  const ga4 = tags.tracking?.ga4?.trim();
  if (ga4) {
    injectScript("mc-ga4-loader", { async: "", src: `https://www.googletagmanager.com/gtag/js?id=${ga4}` });
    injectScript(
      "mc-ga4-init",
      {},
      `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4}');`,
    );
  }

  const pixel = tags.tracking?.meta_pixel?.trim();
  if (pixel) {
    injectScript(
      "mc-meta-pixel",
      {},
      `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`,
    );
  }

  const li = tags.tracking?.linkedin_partner?.trim();
  if (li) {
    injectScript(
      "mc-linkedin-init",
      {},
      `_linkedin_partner_id="${li}";window._linkedin_data_partner_ids=window._linkedin_data_partner_ids||[];window._linkedin_data_partner_ids.push(_linkedin_partner_id);`,
    );
    injectScript(
      "mc-linkedin-loader",
      {},
      `(function(l){if(!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};window.lintrk.q=[]}var s=document.getElementsByTagName("script")[0];var b=document.createElement("script");b.type="text/javascript";b.async=true;b.src="https://snap.licdn.com/li.lms-analytics/insight.min.js";s.parentNode.insertBefore(b,s)})(window.lintrk);`,
    );
  }

  // JSON-LD Organization schema (auto-built from structured fields if no override)
  const org = tags.organization;
  let jsonLd = tags.json_ld_organization?.trim();
  if (!jsonLd && org?.legal_name) {
    jsonLd = JSON.stringify({
      "@context": "https://schema.org",
      "@type": org.type || "Organization",
      name: org.legal_name,
      url: canonicalOrigin,
      ...(Array.isArray(org.social_links) && org.social_links.filter(Boolean).length
        ? { sameAs: org.social_links.filter(Boolean) }
        : {}),
    });
  }
  if (jsonLd && !document.getElementById("mc-jsonld-org")) {
    const s = document.createElement("script");
    s.id = "mc-jsonld-org";
    s.type = "application/ld+json";
    s.setAttribute("data-mc-injected", "true");
    s.text = jsonLd;
    document.head.appendChild(s);
  }
};

const usePageMeta = ({ title, description, ogImage, suffix }: PageMetaProps) => {
  const location = useLocation();

  useEffect(() => {
    if (typeof document === "undefined") return;

    let cancelled = false;

    Promise.all([loadGlobalTags(), fetchBrandIdentity()]).then(([tags, identity]) => {
      if (cancelled) return;
      const canonicalOrigin = resolveCanonicalOrigin(identity.canonicalOrigin);
      injectGlobalScripts(tags, canonicalOrigin);

      // Resolve the title suffix from props → brand identity → bare brand
      // name. We never fall back to a brand-specific string here.
      const resolvedSuffix =
        suffix?.trim() ||
        (identity.tagline ? `${identity.brandName} — ${identity.tagline}` : identity.brandName) ||
        "";

      const prefix = tags.social_prefix?.trim() || "";
      const pageTitle = title
        ? resolvedSuffix
          ? `${title} | ${resolvedSuffix}`
          : title
        : resolvedSuffix;
      const socialTitle = prefix ? `${prefix}${pageTitle}` : pageTitle;
      document.title = pageTitle;

      const canonicalUrl = `${canonicalOrigin}${ensureTrailingSlash(location.pathname)}`;

      const setMeta = (name: string, content: string, property?: boolean) => {
        if (!content) return;
        const attr = property ? "property" : "name";
        let el = document.querySelector(`meta[${attr}="${name}"]`);
        if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
        el.setAttribute("content", content);
      };

      // Canonical link
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.setAttribute("rel", "canonical");
        document.head.appendChild(canonical);
      }
      canonical.setAttribute("href", canonicalUrl);

      if (description) setMeta("description", description);
      setMeta("og:title", socialTitle, true);
      if (description) setMeta("og:description", description, true);
      if (ogImage) setMeta("og:image", ogImage, true);
      setMeta("og:url", canonicalUrl, true);
      setMeta("twitter:title", socialTitle);
      if (description) setMeta("twitter:description", description);
      if (ogImage) setMeta("twitter:image", ogImage);
    });

    return () => {
      cancelled = true;
    };
  }, [title, description, ogImage, suffix, location.pathname]);
};

export default usePageMeta;
