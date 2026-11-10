import { Instagram, Linkedin, Twitter, Facebook, Youtube } from "lucide-react";
import { transformImageUrl } from "@/services/mediaOptimization";
import { useLocation } from "react-router-dom";
import { useSiteContentWithStatus } from "@/hooks/useSiteContent";
import PageBreadcrumbs, { type BreadcrumbEntry } from "@/features/site/PageBreadcrumbs";
import { pillarColorFromLink } from "@/lib/constants/pillarColors";
import type { SectionShapeConfig } from "@/types/rows";


const PLATFORMS = [
  { key: "linkedin", icon: Linkedin, label: "LinkedIn" },
  { key: "instagram", icon: Instagram, label: "Instagram" },
  { key: "twitter", icon: Twitter, label: "Twitter / X" },
  { key: "facebook", icon: Facebook, label: "Facebook" },
  { key: "youtube", icon: Youtube, label: "YouTube" },
  { key: "tiktok", icon: null, label: "TikTok" },
  { key: "threads", icon: null, label: "Threads" },
];

const TikTokIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52V6.79a4.85 4.85 0 01-1-.1z" />
  </svg>
);

const ThreadsIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.186 24h-.007C5.461 23.956.057 18.529.007 11.786l-.001-.006C.05 5.046 5.463-.37 12.193.007 18.924.383 24.007 5.84 23.993 12.572v.009c-.012 6.546-4.468 11.408-10.596 12.285a12.88 12.88 0 01-1.211.134zM12 2.5A9.5 9.5 0 002.5 12 9.5 9.5 0 0012 21.5 9.5 9.5 0 0021.5 12 9.5 9.5 0 0012 2.5z" />
  </svg>
);

interface FooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

interface FooterContent {
  copyright?: string;
  tagline?: string;
  columns?: FooterColumn[];
  /** Optional decorative top edge — the dark footer spills UP over the row above. */
  shapeTop?: SectionShapeConfig;
}

/**
 * `pageAnswer` is the page's plain answer (what this is, for whom, how the
 * work happens), written on the hero block and shown here as small print
 * beside the Connect column. It used to sit under the headline at
 * subtitle size; the owner wanted it quieter, so the hero no longer
 * renders it and every page with a hero passes it down here. Blog pages
 * do not pass one.
 */
const Footer = ({ breadcrumbTrail, pageAnswer }: { breadcrumbTrail?: BreadcrumbEntry[]; pageAnswer?: string }) => {
  const { pathname } = useLocation();
  /* Footer hash links (#vows, #contact) point at rows that only exist
     on the homepage. When the footer renders on /blog or a CMS page we
     rewrite them to absolute `/#slug` links so they navigate home and
     then scroll, instead of silently doing nothing. */
  const resolveHref = (href: string) =>
    href.startsWith("#") && pathname !== "/" ? `/${href}` : href;

  const { isLoading: socialLoading, content: socialLinks } =
    useSiteContentWithStatus<Record<string, string>>("social_links", {});

  // No hardcoded fallback content. The DB is the single source of truth;
  // until "footer" arrives we render an empty shell rather than flashing
  // stale defaults like "Based in Sweden 🇸🇪 · Operating globally" or a
  // "Blog" link that may have been removed.
  const { isLoading: footerLoading, content: footer } =
    useSiteContentWithStatus<FooterContent>("footer", {});
  const { isLoading: brandingLoading, content: branding } =
    useSiteContentWithStatus<Record<string, any>>("branding", {});
  /* The footer sits on the light page mesh (redesign): prefer the dark
     mark; if the brand only ships a light one, darken it with the same
     `.logo-darken` filter the navbar uses. */
  const darkEmblem = branding.emblem_dark_url || branding.logo_dark_url || "";
  const lightEmblem = branding.emblem_logo_url || branding.logo_url || "";
  const emblemUrl = darkEmblem || lightEmblem;
  const needsDarken = !darkEmblem;

  const columns = !footerLoading && Array.isArray(footer.columns) ? footer.columns : [];
  const activeLinks = socialLoading ? [] : PLATFORMS.filter((p) => socialLinks[p.key]?.trim());
  const connectColumn = columns.find((c) => String(c?.title || "").toLowerCase() === "connect");
  const answer = pageAnswer?.trim();

  const headingClass = "font-body font-bold uppercase mb-4";
  const headingStyle = { color: "hsl(var(--gold-text))", fontSize: "var(--fs-eyebrow)", letterSpacing: "0.26em" } as const;
  const linkClass = "font-body inline-flex items-center gap-3 transition-colors duration-300 hover:text-[hsl(var(--heading))]";
  const linkStyle = { color: "hsl(var(--body))", fontSize: 15, lineHeight: 1.4 } as const;
  const smallStyle = { color: "hsl(var(--meta))", fontSize: 13 } as const;

  const emblem = !brandingLoading && emblemUrl ? (
    /* Below the fold by definition: lazy-load it. */
    <img
      alt="The Magic Coffin logo"
      className={`w-8 h-8 object-contain flex-none${needsDarken ? " logo-darken" : ""}`}
      src={transformImageUrl(emblemUrl, { width: 96, quality: 85 })}
      width={32}
      height={32}
      loading="lazy"
      decoding="async"
    />
  ) : null;

  return (
    <footer className="site-footer relative" style={{ borderTop: "1px solid hsl(var(--line-1))", scrollSnapAlign: "end" }}>
      <div className="relative z-10 max-w-[1280px] mx-auto row-container" style={{ paddingTop: 56, paddingBottom: 40 }}>
        {breadcrumbTrail && breadcrumbTrail.length > 1 ? (
          <PageBreadcrumbs trail={breadcrumbTrail} placement="footer" />
        ) : null}

        <div className="flex flex-wrap justify-between" style={{ gap: "40px clamp(32px, 6vw, 96px)" }}>
          {/* Brand block: the page's plain answer, in small print. */}
          <div className="min-w-0" style={{ flex: "1 1 420px", maxWidth: 560 }} {...(answer ? { "data-page-answer": true } : {})}>
            {answer ? (
              <>
                <h4 className={headingClass} style={headingStyle}>In plain words</h4>
                <p className="font-body" style={{ color: "hsl(var(--body))", fontSize: 15, lineHeight: 1.6 }}>{answer}</p>
              </>
            ) : emblem}
          </div>

          <div className="flex flex-wrap" style={{ gap: "32px clamp(32px, 5vw, 80px)" }}>
            {columns.map((col, i) => (
              <div key={i} style={{ minWidth: 140 }}>
                <h4 className={headingClass} style={headingStyle}>{col.title}</h4>
                <ul className="flex flex-col" style={{ gap: 12 }}>
                  {(Array.isArray(col.links) ? col.links : []).map((link, j) => {
                    /* Services column: a pillar-coloured dot before each service link. */
                    const dot = pillarColorFromLink(link.href);
                    return (
                      <li key={j}>
                        <a href={resolveHref(link.href)} className={linkClass} style={linkStyle}>
                          {dot ? <span aria-hidden className="inline-block rounded-full flex-none" style={{ width: 10, height: 10, backgroundColor: dot }} /> : null}
                          {link.label}
                        </a>
                      </li>
                    );
                  })}

                  {col === connectColumn && activeLinks.map((p) => {
                    const Icon = p.key === "tiktok" ? TikTokIcon : p.key === "threads" ? ThreadsIcon : p.icon;
                    return (
                      <li key={p.key}>
                        <a href={socialLinks[p.key]} target="_blank" rel="noopener noreferrer" className={linkClass} style={linkStyle}>
                          {Icon && <Icon className="w-4 h-4" />}
                          {p.label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom rule: emblem and city line on the left, the legal line
            on the right. flex-wrap lets the legal line drop under the
            cities on a phone. "Cookie Settings" is a <button> because it
            opens the consent panel instead of navigating. */}
        <div
          className="flex flex-wrap items-center justify-between gap-4"
          style={{ borderTop: "1px solid hsl(var(--line-1))", marginTop: 40, paddingTop: 24 }}
        >
          <div className="flex items-center gap-4 min-w-0">
            {answer ? emblem : null}
            {!footerLoading && footer.tagline ? (
              <p className="font-body uppercase" style={{ color: "hsl(var(--meta))", fontSize: 12, letterSpacing: "0.22em", lineHeight: 1.6 }}>
                {footer.tagline}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-body" style={smallStyle}>
            {!footerLoading && footer.copyright ? (
              <>
                <span>{footer.copyright}</span>
                <span aria-hidden="true">·</span>
              </>
            ) : null}
            <a
              href="/privacy-policy"
              className="transition-colors duration-300 hover:text-[hsl(var(--heading))]"
            >
              Privacy Policy
            </a>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => {
                // Defensive try/catch — dispatching a CustomEvent should
                // never throw in a modern browser, but if some extension
                // monkey-patches `dispatchEvent` we don't want the whole
                // footer to crash. Worst case: the panel just doesn't
                // re-open and we log the failure for debugging.
                //
                // Event name MUST match the listener inside
                // `src/features/site/CookieConsent.tsx` ("tmc:open-consent").
                // If you rename one, rename both.
                try {
                  window.dispatchEvent(new CustomEvent("tmc:open-consent"));
                } catch (err) {
                  console.warn("Failed to open cookie settings:", err);
                }
              }}
              className="transition-colors duration-300 hover:text-[hsl(var(--heading))] bg-transparent border-0 p-0 cursor-pointer"
              style={{ font: "inherit", color: "inherit" }}
            >
              Cookie Settings
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
