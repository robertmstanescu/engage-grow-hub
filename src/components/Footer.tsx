import { Instagram, Linkedin, Twitter, Facebook, Youtube } from "lucide-react";
import { useSiteContent } from "@/hooks/useSiteContent";

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

const defaultColumns: FooterColumn[] = [
  {
    title: "Services",
    links: [
      { label: "Internal Communications", href: "#internal-communications" },
      { label: "Employee Experience", href: "#employee-experience" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Our Vows", href: "#vows" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "#contact" },
    ],
  },
  {
    title: "Connect",
    links: [],
  },
];

const Footer = () => {
  const socialLinks = useSiteContent<Record<string, string>>("social_links", {});
  const footer = useSiteContent<FooterContent>("footer", {
    copyright: `© ${new Date().getFullYear()} The Magic Coffin for Silly Vampires`,
    tagline: "Based in Sweden 🇸🇪 · Operating globally",
    columns: defaultColumns,
  });
  const branding = useSiteContent<Record<string, any>>("branding", {});
  const logoUrl = branding.logo_url || "/lovable-uploads/25c16e30-e0dd-4cbd-b9b7-02f72d962fb9.png";

  const columns = footer.columns || defaultColumns;
  const activeLinks = PLATFORMS.filter((p) => socialLinks[p.key]?.trim());

  // Merge social links into the "Connect" column if it exists
  const connectColumn = columns.find((c) => c.title.toLowerCase() === "connect");

  return (
    <footer className="grain relative border-t" style={{ backgroundColor: "hsl(260 20% 4%)", borderColor: "hsl(var(--border) / 0.2)" }}>
      <div className="relative z-10 max-w-[1100px] mx-auto px-8 lg:pl-24 py-16 md:py-20">
        {/* Top: Logo + columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-14">
          {/* Logo column */}
          <div className="col-span-2 md:col-span-1">
            <img alt="Logo" className="w-8 h-8 object-contain brightness-200 mb-4" src={logoUrl} />
            <p className="font-body text-xs leading-relaxed" style={{ color: "hsl(var(--foreground) / 0.3)" }}>
              {footer.tagline || "Based in Sweden 🇸🇪 · Operating globally"}
            </p>
          </div>

          {/* Dynamic columns */}
          {columns.map((col, i) => (
            <div key={i}>
              <h4 className="font-body text-[10px] uppercase tracking-[0.25em] font-semibold mb-4" style={{ color: "hsl(var(--foreground) / 0.5)" }}>
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link, j) => (
                  <li key={j}>
                    <a
                      href={link.href}
                      className="font-body text-xs transition-all duration-500 hover:opacity-100"
                      style={{ color: "hsl(var(--foreground) / 0.35)" }}>
                      {link.label}
                    </a>
                  </li>
                ))}
                {/* Add social links to Connect column */}
                {col === connectColumn && activeLinks.map((p) => {
                  const Icon = p.key === "tiktok" ? TikTokIcon : p.key === "threads" ? ThreadsIcon : p.icon;
                  return (
                    <li key={p.key}>
                      <a
                        href={socialLinks[p.key]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-body text-xs transition-all duration-500 hover:opacity-100 inline-flex items-center gap-1.5"
                        style={{ color: "hsl(var(--foreground) / 0.35)" }}>
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

        {/* Bottom bar */}
        <div className="pt-6 flex flex-wrap items-center justify-between gap-4" style={{ borderTop: "1px solid hsl(var(--border) / 0.15)" }}>
          <p className="font-body text-[11px] tracking-wide" style={{ color: "hsl(var(--foreground) / 0.2)" }}>
            {footer.copyright || `© ${new Date().getFullYear()} The Magic Coffin for Silly Vampires`}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
