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
      alt="Logo"
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
   * Decide whether the desktop vertical rail can fit in the viewport.
   * We compute needed height from item count rather than measuring the
   * DOM — once we've switched to horizontal the rail's actual height
   * shrinks, so a DOM-based measurement would flip us back into vertical
   * and oscillate.
   *
   * Per-item budget in the vertical rail (labels are rotated 90° so
   * their visual height ≈ label width — ~150px covers realistic labels):
   *   item ≈ 150px, gap ≈ 20px, fixed chrome ≈ 128px (logo + CTA + padding).
   */
  useLayoutEffect(() => {
    const ITEM_HEIGHT = 120;
    const ITEM_GAP = 16;
    const CHROME = 80;
    const check = () => {
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      if (!isDesktop) {
        setVerticalFits(true);
        return;
      }
      const count = renderedItems.length;
      if (count === 0) {
        setVerticalFits(true);
        return;
      }
      const needed = CHROME + count * ITEM_HEIGHT + Math.max(0, count - 1) * ITEM_GAP;
      setVerticalFits(needed <= window.innerHeight);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [renderedItems.length]);

  /**
   * Publish the navbar's current footprint as CSS custom properties on
   * <html>, so page wrappers can offset content using a single source of
   * truth instead of hardcoded `lg:pl-16` / `pt-14` classes.
   *
   *   --nav-left-offset → horizontal space the left-rail nav occupies
   *   --nav-top-offset  → vertical space the top-bar nav occupies
   *
   * Three modes:
   *   1. Mobile (<lg)         → top bar (56px) → top offset only
   *   2. Desktop, vertical    → left rail (64px) → left offset only
   *   3. Desktop, horizontal  → top bar (56px)  → top offset only
   */
  useLayoutEffect(() => {
    const apply = () => {
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      const root = document.documentElement;
      if (!isDesktop) {
        root.style.setProperty("--nav-left-offset", "0px");
        root.style.setProperty("--nav-top-offset", "36px");
      } else if (verticalFits) {
        root.style.setProperty("--nav-left-offset", "40px");
        root.style.setProperty("--nav-top-offset", "0px");
      } else {
        root.style.setProperty("--nav-left-offset", "0px");
        root.style.setProperty("--nav-top-offset", "36px");
      }
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [verticalFits]);

  return (
    <>
      {/*
        Desktop navigation. Default = vertical left rail.
        When the rail's content height exceeds the viewport (short
        windows, lots of links, zoomed-in browsers), we collapse to a
        horizontal top bar that always fits.
      */}
      <nav
        ref={railRef}
        className={
          verticalFits
            ? "hidden lg:flex fixed left-0 top-0 bottom-0 z-50 w-10 flex-col items-center py-row-fluid-lg gap-4"
            : "hidden lg:flex fixed top-0 left-0 right-0 z-50 h-9 flex-row items-center px-3 gap-4"
        }
        style={
          verticalFits
            ? {
                backgroundColor: "hsl(var(--background) / 0.8)",
                backdropFilter: "blur(12px)",
                borderRight: "1px solid hsl(var(--border) / 0.3)",
              }
            : {
                backgroundColor: "hsl(var(--background) / 0.9)",
                backdropFilter: "blur(12px)",
                borderBottom: "1px solid hsl(var(--border) / 0.2)",
              }
        }
      >
        <a
          href="/"
          className={verticalFits ? "mb-2" : "flex items-center flex-shrink-0"}
          style={{
            // Cascade entrance — runs once on mount via the global
            // `nav-cascade` keyframe (see index.css). We can't use
            // framer-motion here because <ResponsiveLogo/> is a plain
            // function component and motion's ref-forwarding would warn,
            // and because the side-nav links rely on a CSS rotate(180deg)
            // that motion's inline transform would clobber.
            animation: "nav-cascade-emblem 1100ms cubic-bezier(0.16, 1, 0.3, 1) 2600ms both",
          }}
        >
          {!brandingLoading && logoUrl ? (
            <ResponsiveLogo
              emblemUrl={emblemUrl}
              logoUrl={logoUrl}
              imgClassName={
                verticalFits ? "w-6 h-6 object-contain brightness-200" : "h-5 object-contain brightness-200"
              }
              width={verticalFits ? 24 : undefined}
              height={verticalFits ? 24 : 20}
            />
          ) : null}
        </a>

        <div
          className={
            verticalFits
              ? "flex-1 flex flex-col items-center justify-center gap-5"
              : "flex-1 flex-row gap-6 flex items-center justify-start"
          }
        >
          {renderedItems.map((item, i) => {
            const active = isActive(item.href);
            // CSS-driven cascade. Vertical (rail) labels carry an
            // intrinsic rotate(180deg) so we use a non-transform fade
            // keyframe (`nav-cascade-fade`) for them; horizontal labels
            // get the slide-in keyframe (`nav-cascade`).
            const animName = verticalFits ? "nav-cascade-fade" : "nav-cascade";
            return (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className={
                  verticalFits
                    ? "side-nav-label font-body"
                    : "top-nav-label font-body"
                }
                data-active={active}
                style={{
                  color: active ? "hsl(var(--accent))" : "hsl(var(--foreground) / 0.55)",
                  fontWeight: active ? 600 : 400,
                  animation: `${animName} 900ms cubic-bezier(0.16, 1, 0.3, 1) ${3300 + i * 150}ms both`,
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
            className={
              verticalFits
                ? "w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold transition-all duration-500 hover:scale-110"
                : "px-3 h-6 rounded-full flex items-center justify-center text-[9px] font-bold uppercase tracking-[0.14em] transition-all duration-300 hover:opacity-90 whitespace-nowrap"
            }
            style={{
              backgroundColor: "hsl(var(--accent))",
              color: "hsl(var(--accent-foreground))",
              animation: `nav-cascade-fade 900ms cubic-bezier(0.16, 1, 0.3, 1) ${
                3300 + renderedItems.length * 150
              }ms both`,
            }}
          >
            {verticalFits ? "→" : ctaText || "→"}
          </a>
        ) : null}
      </nav>

      {/* Mobile/tablet top bar — full/long logo */}
      <nav
        className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-5"
        style={{
          backgroundColor: "hsl(var(--background) / 0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid hsl(var(--border) / 0.2)",
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
              imgClassName="h-7 brightness-200 object-contain"
              height={28}
            />
          ) : null}
        </a>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
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
