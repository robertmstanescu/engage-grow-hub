import { Instagram, Linkedin, Twitter, Facebook, Youtube } from "lucide-react";
import { useSiteContentWithStatus } from "@/hooks/useSiteContent";

const PLATFORMS = [
  { key: "linkedin", icon: Linkedin, label: "LinkedIn" },
  { key: "instagram", icon: Instagram, label: "Instagram" },
  { key: "twitter", icon: Twitter, label: "Twitter / X" },
  { key: "facebook", icon: Facebook, label: "Facebook" },
  { key: "youtube", icon: Youtube, label: "YouTube" },
  { key: "tiktok", icon: null, label: "TikTok" },
  { key: "threads", icon: null, label: "Threads" },
];

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52V6.79a4.85 4.85 0 01-1-.1z" />
  </svg>
);

const ThreadsIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
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
}

const Footer = () => {
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
  // Footer uses emblem logo (small icon) on all sizes
  const emblemUrl = branding.emblem_logo_url || branding.logo_url || "";

  const columns = !footerLoading && Array.isArray(footer.columns) ? footer.columns : [];
  const activeLinks = socialLoading ? [] : PLATFORMS.filter((p) => socialLinks[p.key]?.trim());
  const connectColumn = columns.find((c) => c.title.toLowerCase() === "connect");

  return (
    <footer className="grain relative border-t" style={{ backgroundColor: "hsl(260 20% 4%)", borderColor: "hsl(var(--border) / 0.2)" }}>
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-8 blur-[120px]"
        style={{ background: "radial-gradient(circle, hsl(280 55% 20%), transparent)" }} />

      <div className="relative z-10 max-w-[1100px] mx-auto px-3 pt-16 md:pt-20 pb-2">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-14">
          {/* Logo column — emblem */}
          <div className="col-span-2 md:col-span-1">
            {/* Footer logo: below the fold by definition — lazy-load it. */}
            {!brandingLoading && emblemUrl ? (
              <img
                alt="Logo"
                className="w-8 h-8 object-contain brightness-200 mb-4"
                src={emblemUrl}
                width={32}
                height={32}
                loading="lazy"
                decoding="async"
              />
            ) : null}
            {!footerLoading && footer.tagline ? (
              <p className="font-body text-xs leading-relaxed" style={{ color: "hsl(var(--foreground) / 0.35)" }}>
                {footer.tagline}
              </p>
            ) : null}
          </div>

          {columns.map((col, i) => (
            <div key={i}>
              <h4 className="font-body text-[10px] uppercase tracking-[0.25em] font-semibold mb-4" style={{ color: "hsl(var(--foreground) / 0.5)" }}>
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link, j) => (
                  <li key={j}>
                    <a href={link.href} className="font-body text-xs transition-all duration-500 hover:opacity-100" style={{ color: "hsl(var(--foreground) / 0.35)" }}>
                      {link.label}
                    </a>
                  </li>
                ))}
                {col === connectColumn && activeLinks.map((p) => {
                  const Icon = p.key === "tiktok" ? TikTokIcon : p.key === "threads" ? ThreadsIcon : p.icon;
                  return (
                    <li key={p.key}>
                      <a href={socialLinks[p.key]} target="_blank" rel="noopener noreferrer" className="font-body text-xs transition-all duration-500 hover:opacity-100 inline-flex items-center gap-1.5" style={{ color: "hsl(var(--foreground) / 0.35)" }}>
                        {Icon && <Icon />}
                        {p.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/*
          Bottom legal row.
          ───────────────────────────────────────────────────────────
          Layout:
            • flex-wrap so on very narrow screens the legal links can
              drop to a second line under the copyright instead of
              overflowing horizontally.
            • justify-between pushes copyright to the LEFT and the
              legal-link group to the RIGHT on desktop. On mobile the
              wrap behaviour means each cluster sits on its own line.
            • gap-4 prevents the two clusters from touching when they
              share a row.
          ───────────────────────────────────────────────────────────
          Typography:
            • Both the copyright text and the legal links share the
              EXACT same classes (`font-body text-[11px] tracking-wide`)
              and base color (`hsl(var(--foreground) / 0.2)`) so the
              row reads as one consistent legal-line. Hover lifts the
              link colour to `hsl(var(--foreground))` (full opacity)
              over a 500ms transition matching the rest of the footer.
            • The middot `·` between Privacy Policy and Cookie Settings
              is a plain text separator. We deliberately use a literal
              character (not a border) so it inherits the same colour
              and never breaks at the wrong moment.
          ───────────────────────────────────────────────────────────
          Why a <button> for Cookie Settings (not an <a>)?
            It does not navigate — it triggers a `cookie-settings:open`
            CustomEvent that the cookie-consent banner listens for so
            it can re-open. Using a <button> keeps semantics correct
            for screen readers and keyboard users.
        */}
        <div
          className="pt-6 flex flex-wrap items-center justify-between gap-4"
          style={{ borderTop: "1px solid hsl(var(--border) / 0.15)" }}
        >
          <p className="font-body text-[11px] tracking-wide" style={{ color: "hsl(var(--foreground) / 0.2)" }}>
            {!footerLoading && footer.copyright ? footer.copyright : null}
          </p>

          <div className="flex items-center gap-2">
            <a
              href="/privacy-policy"
              className="font-body text-[11px] tracking-wide transition-colors duration-500 hover:text-foreground"
              style={{ color: "hsl(var(--foreground) / 0.2)" }}
            >
              Privacy Policy
            </a>
            <span
              aria-hidden="true"
              className="font-body text-[11px] tracking-wide"
              style={{ color: "hsl(var(--foreground) / 0.2)" }}
            >
              ·
            </span>
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
              className="font-body text-[11px] tracking-wide transition-colors duration-500 hover:text-foreground bg-transparent border-0 p-0 cursor-pointer"
              style={{ color: "hsl(var(--foreground) / 0.2)" }}
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
