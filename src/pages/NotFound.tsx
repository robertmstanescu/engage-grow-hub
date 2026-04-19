/**
 * NotFound — the 404 page.
 *
 * ────────────────────────────────────────────────────────────────────
 * THEME: LIGHT (intentional)
 * ────────────────────────────────────────────────────────────────────
 * The rest of the public site is dark luxury, but error pages use a
 * LIGHT cream surface (`--light-bg` / `--light-fg`) so they read as
 * neutral system pages — easier on the eyes when something has gone
 * wrong, and visually distinct from regular content. Do not change
 * back to `--background` / `--foreground` (those are the dark tokens).
 *
 * ────────────────────────────────────────────────────────────────────
 * EDITABLE COPY
 * ────────────────────────────────────────────────────────────────────
 * The headline, subhead and CTA label come from `site_content` under
 * the `error_404` section_key. Admins edit them via PagesManager →
 * "Error Pages". We pass a hardcoded fallback so the page still works
 * if the DB row is missing or the request hasn't resolved yet.
 */

import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useSiteContent } from "@/hooks/useSiteContent";

interface Error404Content {
  headline: string;
  subhead: string;
  cta_label: string;
}

const FALLBACK: Error404Content = {
  headline: "404",
  subhead: "Oops! We couldn’t find that page.",
  cta_label: "Return to home",
};

const NotFound = () => {
  const location = useLocation();
  const content = useSiteContent<Error404Content>("error_404", FALLBACK);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div
      className="flex min-h-screen items-center justify-center px-6"
      style={{ backgroundColor: "hsl(var(--light-bg))", color: "hsl(var(--light-fg))" }}
    >
      <div className="text-center max-w-md">
        <h1 className="font-display text-6xl font-bold mb-4" style={{ color: "hsl(var(--light-fg))" }}>
          {content.headline}
        </h1>
        <p className="font-body text-lg mb-6" style={{ color: "hsl(var(--light-fg) / 0.7)" }}>
          {content.subhead}
        </p>
        <a
          href="/"
          className="inline-block font-body text-xs uppercase tracking-wider px-6 py-3 rounded-full hover:opacity-80 transition-opacity"
          style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
        >
          {content.cta_label}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
