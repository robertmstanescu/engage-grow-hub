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
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52V6.79a4.85 4.85 0 01-1-.1z" />
  </svg>
);

const ThreadsIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M12.186 24h-.007C5.461 23.956.057 18.529.007 11.786l-.001-.006C.05 5.046 5.463-.37 12.193.007 18.924.383 24.007 5.84 23.993 12.572v.009c-.012 6.546-4.468 11.408-10.596 12.285a12.88 12.88 0 01-1.211.134zM12 2.5A9.5 9.5 0 002.5 12 9.5 9.5 0 0012 21.5 9.5 9.5 0 0021.5 12 9.5 9.5 0 0012 2.5zm3.28 13.564c-.752.558-1.78.862-2.955.862-.214 0-.432-.012-.653-.036a4.78 4.78 0 01-1.987-.695 2.37 2.37 0 01-.136-.094l.014.009c-.32-.224-.596-.496-.82-.808l1.27-.88c.165.235.38.434.628.585.39.24.858.372 1.337.372.664 0 1.197-.17 1.541-.492.306-.286.467-.673.467-1.119 0-.513-.197-.912-.57-1.153-.385-.248-.943-.374-1.66-.374h-.87v-1.4h.758c.612 0 1.086-.108 1.41-.322.3-.198.44-.48.44-.84 0-.338-.136-.6-.404-.778-.293-.195-.724-.294-1.28-.294-.488 0-.938.113-1.338.335a2.6 2.6 0 00-.724.578l-.988-.996a3.87 3.87 0 011.128-.84 4.07 4.07 0 011.99-.477c.93 0 1.698.222 2.224.642.546.436.834 1.04.834 1.745 0 .466-.136.873-.404 1.213-.218.276-.503.5-.836.66.454.173.82.443 1.074.806.288.41.434.903.434 1.463 0 .793-.312 1.45-.904 1.898z" />
  </svg>
);

const fallback: Record<string, string> = {};

const Footer = () => {
  const links = useSiteContent<Record<string, string>>("social_links", fallback);

  const activeLinks = PLATFORMS.filter((p) => links[p.key]?.trim());

  return (
    <footer className="bg-secondary py-8 px-6 text-center">
      {activeLinks.length > 0 && (
        <div className="flex items-center justify-center gap-4 mb-4">
          {activeLinks.map((p) => {
            const Icon = p.key === "tiktok" ? TikTokIcon : p.key === "threads" ? ThreadsIcon : p.icon;
            return (
              <a
                key={p.key}
                href={links[p.key]}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={p.label}
                className="text-primary-foreground/40 hover:text-primary-foreground/70 transition-colors">
                {Icon && <Icon />}
              </a>
            );
          })}
        </div>
      )}
      <p className="font-body text-xs text-primary-foreground/40">
        © {new Date().getFullYear()} The Magic Coffin for Silly Vampires. All rights reserved.
      </p>
      <p className="font-body text-[10px] text-primary-foreground/25 mt-1">
        Based in Sweden 🇸🇪 · Operating globally
      </p>
    </footer>
  );
};

export default Footer;
