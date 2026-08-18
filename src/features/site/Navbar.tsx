import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSiteContent, useSiteContentWithStatus } from "@/hooks/useSiteContent";
import { useIsMobile } from "@/hooks/use-mobile";

const ease = [0.16, 1, 0.3, 1] as const;

/**
 * Browser-native responsive logo. The <picture> element lets the browser
 * pick the correct asset BEFORE React/JS hydration runs, eliminating the
 * "flash of mobile logo on desktop" flicker that a JS-driven swap caused.
 *
 * - Desktop (>=1024px): emblem (square mark) for the left rail
 * - Mobile  (<1024px) : full/long logo for the top bar
 *
 * fetchPriority/loading/decoding attributes promote the logo to a priority
 * paint so it appears as early as possible in the critical render path.
 */
type ResponsiveLogoProps = {
  emblemUrl: string;
  logoUrl: string;
  className?: string;
  imgClassName?: string;
  width?: number;
  height?: number;
};
const ResponsiveLogo = ({ emblemUrl, logoUrl, className, imgClassName, width, height }: ResponsiveLogoProps) => (
  <picture className={className}>
    <source media="(min-width: 1024px)" srcSet={emblemUrl} />
    <img
      src={logoUrl}
      alt="The Magic Coffin logo"
      className={imgClassName}
      width={width}
      height={height}
      // @ts-expect-error – React types lag behind the standard attribute name.
      fetchpriority="high"
      loading="eager"
      decoding="sync"
    />
  </picture>
);

const Navbar = () => {
  const { isLoading: brandingLoading, content: branding } = useSiteContentWithStatus<Record<string, any>>(
    "branding",
    {},
  );
  /**
   * Navbar links MUST come from the DB before we render link labels —
   * otherwise users would briefly see hardcoded fallback labels
   * ("Internal Communications", "Our Vows", etc.) and then watch them
   * change to the admin's customised labels. We use the loading-aware
   * variant here and hide the link list until the real config arrives.
   * Branding/logo can stay on the plain hook because the fallback logo
   * path is identical to the DB default for fresh projects.
   */
  const { isLoading: navLoading, content: navConfig } = useSiteContentWithStatus<Record<string, any>>("navbar", {});
  const logoUrl = branding.logo_url || "";
  const emblemUrl = branding.emblem_logo_url || logoUrl;
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  // When the desktop vertical rail can't fit all items in the viewport
  // height, we collapse to a horizontal top bar (still desktop, just
  // rotated). Measured from the actual rendered rail.
  const [verticalFits, setVerticalFits] = useState(true);
  const railRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Source of truth = DB. We deliberately do NOT keep hardcoded link
  // fallbacks anymore: showing stale labels (e.g. "Blog", "Our Vows")
  // before the real config loads caused a visible content swap on every
  // refresh, especially in Safari where bfcache could re-show very old
  // values. While loading, the rail renders no items.
  const subLinks = Array.isArray(navConfig.sub_links) ? navConfig.sub_links : [];
  const links = Array.isArray(navConfig.links) ? navConfig.links : [];
  const showBlogLink = !navLoading && navConfig.show_blog_link === true;
  const ctaText = navConfig.cta_text || "";
  const ctaHref = navConfig.cta_href || "";

  const allItems = navLoading
    ? []
    : [
        ...subLinks.map((l: any) => ({ label: l.label, href: l.href })),
        ...links.map((l: any) => ({ label: l.label, href: l.href })),
        ...(showBlogLink ? [{ label: "Blog", href: "/blog/" }] : []),
      ];
  const renderedItems = allItems;

  const handleScroll = useCallback(() => {
    if (location.pathname !== "/") return;
    const sections = allItems.filter((item) => item.href.startsWith("#")).map((item) => item.href.slice(1));
    let current = "";
    for (const id of sections) {
      const el = document.getElementById(id);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= window.innerHeight / 3) current = id;
      }
    }
    setActiveSection(current);
  }, [location.pathname, allItems]);

  useEffect(() => {
    // Listen on the snap-container (scroll container) if available, else window
    const scrollContainer = document.querySelector(".snap-container") || window;
    /*
      requestAnimationFrame throttle — high-refresh-rate phones (90Hz/120Hz)
      can fire `scroll` events 100+ times per second. Recomputing the active
      section on every event blocks the main thread and causes jank during
      momentum scrolling. Coalescing into a single rAF callback caps the work
      to once-per-paint while keeping the active-link highlight visually
      synchronised with the scroll position.
    */
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        handleScroll();
        ticking = false;
      });
    };
    scrollContainer.addEventListener("scroll", onScroll, { passive: true });
    handleScroll();
    return () => scrollContainer.removeEventListener("scroll", onScroll);
  }, [handleScroll]);

  const handleNavClick = (e: React.MouseEvent<HTMLElement>, href: string) => {
    setMobileOpen(false);
    if (href.startsWith("#")) {
      // Same-page hash links are handled by `useSmoothAnchors` mounted
      // on the homepage scroll container — it intercepts the click and
      // tweens the scroll over ~1.4s for a fluid glide. We must NOT
      // preventDefault here, otherwise that handler bails out.
      if (location.pathname !== "/") {
        e.preventDefault();
        window.location.href = "/" + href;
      }
      // else: fall through — useSmoothAnchors handles the scroll.
      return;
    }
    if (href.startsWith("/")) {
      e.preventDefault();
      navigate(href);
    }
  };

  const isActive = (href: string) => {
    if (href.startsWith("#")) return activeSection === href.slice(1);
    const normalised = location.pathname.replace(/\/$/, "");
    const normHref = href.replace(/\/$/, "");
    return normalised === normHref;
  };

  /**
   * Lativ-style layout: the desktop nav is a floating rounded pill bar
   * pinned to the top, so the vertical rail is retired. We keep the
   * `verticalFits` state name for the offset publishing logic below but
   * it is always false now (horizontal bar on every breakpoint).
   */
  const verticalFits = false;

  /**
   * Publish the navbar's current footprint as CSS custom properties on
   * <html>, so page wrappers can offset content using a single source of
   * truth instead of hardcoded padding classes.
   */
  useLayoutEffect(() => {
    const apply = () => {
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      const root = document.documentElement;
      root.style.setProperty("--nav-left-offset", "0px");
      root.style.setProperty("--nav-top-offset", isDesktop ? "88px" : "56px");
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  return (
    <>
      {/* Desktop navigation — floating rounded pill bar */}
      <nav
        ref={railRef}
        className="hidden lg:flex fixed top-5 left-1/2 -translate-x-1/2 z-50 items-center gap-8 rounded-full pl-6 pr-2 py-2 max-w-[min(1200px,calc(100%-64px))]"
        style={{
          backgroundColor: "hsl(var(--card) / 0.85)",
          backdropFilter: "blur(16px) saturate(140%)",
          WebkitBackdropFilter: "blur(16px) saturate(140%)",
          border: "1px solid hsl(var(--border))",
          boxShadow: "var(--shadow-soft)",
        }}
      >
        <a
          href="/"
          className="flex items-center flex-shrink-0"
          style={{
            animation: "nav-cascade-emblem 1100ms cubic-bezier(0.16, 1, 0.3, 1) 2600ms both",
          }}
        >
          {!brandingLoading && logoUrl ? (
            <ResponsiveLogo emblemUrl={emblemUrl} logoUrl={logoUrl} imgClassName="h-7 object-contain" height={28} />
          ) : null}
        </a>

        <div className="flex-1 flex flex-row items-center justify-center gap-7">
          {renderedItems.map((item, i) => {
            const active = isActive(item.href);
            return (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className="top-nav-label font-body"
                data-active={active}
                style={{
                  color: active ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.7)",
                  fontWeight: active ? 600 : 450,
                  animation: `nav-cascade 900ms cubic-bezier(0.16, 1, 0.3, 1) ${3300 + i * 150}ms both`,
                }}
              >
                {item.label}
              </a>
            );
          })}
        </div>

        {!navLoading && ctaHref ? (
          <a
            href={ctaHref}
            onClick={(e) => handleNavClick(e, ctaHref)}
            title={ctaText}
            className="px-5 h-9 rounded-full flex items-center justify-center text-xs font-semibold tracking-[0.02em] transition-all duration-300 hover:opacity-90 whitespace-nowrap"
            style={{
              backgroundColor: "hsl(var(--nav-cta-bg, 280 57% 16%))",
              color: "hsl(var(--nav-cta-text, 45 60% 96%))",
              animation: `nav-cascade-fade 900ms cubic-bezier(0.16, 1, 0.3, 1) ${
                3300 + renderedItems.length * 150
              }ms both`,
            }}
          >
            {ctaText || "→"}
          </a>
        ) : null}
      </nav>

      {/* Mobile/tablet top bar — full/long logo */}
      <nav
        className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-5"
        style={{
          backgroundColor: "hsl(var(--background) / 0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid hsl(var(--border))",
        }}
      >
        <a
          href="/"
          className="flex items-center flex-shrink-0"
        >
          {!brandingLoading && logoUrl ? (
            <ResponsiveLogo
              emblemUrl={emblemUrl}
              logoUrl={logoUrl}
              className="flex items-center"
              imgClassName="h-7 object-contain"
              height={28}
            />
          ) : null}
        </a>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          style={{
            color: "hsl(var(--foreground) / 0.7)",
          }}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>


      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden fixed inset-0 z-40 flex flex-col items-center justify-center gap-6"
            style={{ backgroundColor: "hsl(var(--background) / 0.95)", backdropFilter: "blur(20px)" }}
          >
            {allItems.map((item, i) => {
              const active = isActive(item.href);
              return (
                <motion.a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.06, ease }}
                  data-active={active}
                  className="mobile-nav-link font-body text-sm uppercase tracking-[0.2em] transition-colors duration-300"
                  style={{ color: active ? "hsl(var(--accent))" : "hsl(var(--foreground) / 0.5)" }}
                >
                  {item.label}
                </motion.a>
              );
            })}
            {ctaHref && ctaText ? (
              <motion.a
                href={ctaHref}
                onClick={(e) => handleNavClick(e, ctaHref)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: allItems.length * 0.06, ease }}
                className="font-display text-[9px] uppercase tracking-[0.1em] font-bold px-8 py-3 rounded-full mt-4"
                style={{ backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}
              >
                {ctaText}
              </motion.a>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
