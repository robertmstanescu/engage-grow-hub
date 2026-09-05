import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown } from "lucide-react";
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
  /** Apply the CSS darkening filter (used when no dark asset is uploaded). */
  darken?: boolean;
};

const ResponsiveLogo = ({ emblemUrl, logoUrl, className, imgClassName, width, height, darken }: ResponsiveLogoProps) => (
  <picture className={className}>
    <source media="(min-width: 1024px)" srcSet={emblemUrl} />
    <img
      src={logoUrl}
      alt="The Magic Coffin logo"
      className={`${imgClassName ?? ""}${darken ? " logo-darken" : ""}`}
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
  /*
   * Light theme → we need the DARK logo assets. Prefer the dedicated dark
   * uploads from Brand settings; when they are missing we fall back to the
   * light asset plus the `.logo-darken` CSS filter so the mark is never
   * pale-on-pale.
   */
  const lightLogo = branding.logo_url || "";
  const lightEmblem = branding.emblem_logo_url || lightLogo;
  const darkLogo = branding.logo_dark_url || "";
  const darkEmblem = branding.emblem_dark_url || darkLogo;
  const logoUrl = darkLogo || lightLogo;
  const emblemUrl = darkEmblem || (darkLogo ? darkLogo : lightEmblem);
  const needsDarken = !darkLogo && !darkEmblem;

  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Escape closes an open desktop dropdown.
  useEffect(() => {
    if (!openDropdown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenDropdown(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openDropdown]);

  // (Desktop nav is a horizontal pill bar — see below.)

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
  const ctaText = navConfig.cta_text || "Get started";
  const ctaHref = navConfig.cta_href || "";
  const servicesLabel = navConfig.services_label || "Services";
  const servicesHref = navConfig.services_href || "";
  const servicesIndex = Number.isFinite(Number(navConfig.services_index))
    ? Math.max(0, Number(navConfig.services_index))
    : 0;

  type NavItem =
    | { kind: "link"; label: string; href: string }
    | { kind: "dropdown"; label: string; href: string; items: { label: string; href: string }[] };

  const baseLinks: NavItem[] = navLoading
    ? []
    : [
        ...links.map((l: any) => ({ kind: "link" as const, label: l.label, href: l.href })),
        ...(showBlogLink ? [{ kind: "link" as const, label: "Blog", href: "/blog/" }] : []),
      ];

  const navItems: NavItem[] = [...baseLinks];
  if (!navLoading && subLinks.length > 0) {
    navItems.splice(Math.min(servicesIndex, navItems.length), 0, {
      kind: "dropdown",
      label: servicesLabel,
      href: servicesHref,
      items: subLinks.map((l: any) => ({ label: l.label, href: l.href })),
    });
  }

  // Flat list used for scroll-spy and the mobile overlay ordering.
  const allItems = navItems.flatMap((item) =>
    item.kind === "dropdown"
      ? [...(item.href ? [{ label: item.label, href: item.href }] : []), ...item.items]
      : [{ label: item.label, href: item.href }],
  );
  const renderedItems = navItems;


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
  /**
   * The navbar is now a floating island rendered OVER the page (Lativ
   * reference): content scrolls underneath it, so no vertical space is
   * reserved. The offsets stay published as 0 so existing
   * `calc(100vh - var(--nav-top-offset))` rules resolve to full height.
   */
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--nav-left-offset", "0px");
    root.style.setProperty("--nav-top-offset", "0px");
  }, []);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const target = (document.querySelector(".snap-container") as HTMLElement | null) || window;
    const read = () =>
      setScrolled((target === window ? window.scrollY : (target as HTMLElement).scrollTop) > 12);
    read();
    target.addEventListener("scroll", read, { passive: true });
    return () => target.removeEventListener("scroll", read);
  }, []);

  return (
    <>
      {/* Desktop navigation — wide floating island the page scrolls under */}
      <nav
        ref={railRef}
        className="hidden lg:grid fixed left-1/2 -translate-x-1/2 z-50 w-[96vw] max-w-[1780px] grid-cols-[auto_1fr_auto] items-center gap-6 pl-7 pr-3 transition-all duration-300"
        style={{
          top: scrolled ? "10px" : "16px",
          paddingTop: scrolled ? "8px" : "12px",
          paddingBottom: scrolled ? "8px" : "12px",
          borderRadius: "calc(var(--radius) * 1.6)",
          backgroundColor: `hsl(var(--card) / ${scrolled ? 0.97 : 0.92})`,
          backdropFilter: "blur(18px) saturate(140%)",
          WebkitBackdropFilter: "blur(18px) saturate(140%)",
          border: "1px solid hsl(var(--border))",
          boxShadow: "var(--shadow-soft)",
        }}
      >
        <a href="/" className="flex items-center flex-shrink-0">
          {!brandingLoading && logoUrl ? (
            <ResponsiveLogo
              emblemUrl={emblemUrl}
              logoUrl={logoUrl}
              imgClassName="h-8 object-contain"
              height={32}
              darken={needsDarken}
            />
          ) : null}
        </a>

        <div className="flex flex-row items-center justify-center gap-9 min-w-0">
          {renderedItems.map((item) => {
            if (item.kind === "dropdown") {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const active =
                (item.href && isActive(item.href)) ||
                item.items.some((s) => isActive(s.href)) ||
                location.pathname.startsWith("/services");
              const open = openDropdown === item.label;
              return (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => setOpenDropdown(item.label)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <a
                    href={item.href || "#"}
                    onClick={(e) => {
                      if (!item.href) {
                        e.preventDefault();
                        setOpenDropdown(open ? null : item.label);
                        return;
                      }
                      handleNavClick(e, item.href);
                    }}
                    onFocus={() => setOpenDropdown(item.label)}
                    aria-haspopup="true"
                    aria-expanded={open}
                    className="top-nav-label font-body inline-flex items-center gap-1"
                    data-active={active}
                    style={{
                      color: active ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.72)",
                      fontWeight: active ? 600 : 450,
                    }}
                  >
                    {item.label}
                    <ChevronDown
                      size={13}
                      style={{
                        transition: "transform 200ms ease",
                        transform: open ? "rotate(180deg)" : "none",
                      }}
                    />
                  </a>
                  <AnimatePresence>
                    {open && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18, ease }}
                        className="absolute left-1/2 -translate-x-1/2 top-full pt-3 min-w-[240px] z-50"
                      >
                        <div
                          className="flex flex-col py-2"
                          style={{
                            borderRadius: "calc(var(--radius) * 1.2)",
                            backgroundColor: "hsl(var(--card) / 0.98)",
                            backdropFilter: "blur(18px) saturate(140%)",
                            WebkitBackdropFilter: "blur(18px) saturate(140%)",
                            border: "1px solid hsl(var(--border))",
                            boxShadow: "var(--shadow-soft)",
                          }}
                        >
                          {item.items.map((sub) => {
                            const subActive = isActive(sub.href);
                            return (
                              <a
                                key={sub.href + sub.label}
                                href={sub.href}
                                onClick={(e) => {
                                  setOpenDropdown(null);
                                  handleNavClick(e, sub.href);
                                }}
                                className="top-nav-label font-body px-4 py-2 whitespace-nowrap transition-colors duration-150 hover:bg-[hsl(var(--muted))]"
                                data-active={subActive}
                                style={{
                                  color: subActive ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.78)",
                                  fontWeight: subActive ? 600 : 450,
                                }}
                              >
                                {sub.label}
                              </a>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }
            const active = isActive(item.href);
            return (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className="top-nav-label font-body"
                data-active={active}
                style={{
                  color: active ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.72)",
                  fontWeight: active ? 600 : 450,
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
            className="px-6 h-10 rounded-full flex items-center justify-center text-xs font-semibold tracking-[0.02em] transition-colors duration-200 whitespace-nowrap"
            style={{
              backgroundColor: "hsl(var(--nav-cta-bg, 280 57% 16%))",
              color: "hsl(var(--nav-cta-text, 45 60% 96%))",
            }}
          >
            {ctaText}
          </a>
        ) : (
          <span />
        )}
      </nav>

      {/* Mobile/tablet — compact floating island, content passes under */}
      <nav
        className="lg:hidden fixed top-2 left-2 right-2 z-50 h-14 flex items-center justify-between px-4"
        style={{
          borderRadius: "calc(var(--radius) * 1.4)",
          backgroundColor: "hsl(var(--card) / 0.94)",
          backdropFilter: "blur(16px) saturate(140%)",
          WebkitBackdropFilter: "blur(16px) saturate(140%)",
          border: "1px solid hsl(var(--border))",
          boxShadow: "var(--shadow-soft)",
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
              darken={needsDarken}
            />
          ) : null}
        </a>

        <div className="flex items-center gap-2">
          {!navLoading && ctaHref && ctaText ? (
            <a
              href={ctaHref}
              onClick={(e) => handleNavClick(e, ctaHref)}
              className="hidden sm:flex px-4 h-9 rounded-full items-center justify-center text-xs font-semibold whitespace-nowrap"
              style={{
                backgroundColor: "hsl(var(--nav-cta-bg, 280 57% 16%))",
                color: "hsl(var(--nav-cta-text, 45 60% 96%))",
              }}
            >
              {ctaText}
            </a>
          ) : null}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="min-h-11 min-w-11 flex items-center justify-center"
            style={{ color: "hsl(var(--foreground) / 0.7)" }}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
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
            {renderedItems.map((item) => {
              if (item.kind === "dropdown") {
                return (
                  <div key={item.label} className="flex flex-col items-center gap-3">
                    <a
                      href={item.href || "#"}
                      onClick={(e) => (item.href ? handleNavClick(e, item.href) : e.preventDefault())}
                      className="mobile-nav-link font-body text-sm uppercase tracking-[0.2em] transition-colors duration-200"
                      style={{
                        color: location.pathname.startsWith("/services")
                          ? "hsl(var(--primary))"
                          : "hsl(var(--foreground) / 0.65)",
                      }}
                    >
                      {item.label}
                    </a>
                    <div className="flex flex-col items-center gap-2">
                      {item.items.map((sub) => {
                        const subActive = isActive(sub.href);
                        return (
                          <a
                            key={sub.href + sub.label}
                            href={sub.href}
                            onClick={(e) => handleNavClick(e, sub.href)}
                            data-active={subActive}
                            className="mobile-nav-link font-body text-xs tracking-[0.12em] transition-colors duration-200"
                            style={{
                              color: subActive ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.55)",
                            }}
                          >
                            {sub.label}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              const active = isActive(item.href);
              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  data-active={active}
                  className="mobile-nav-link font-body text-sm uppercase tracking-[0.2em] transition-colors duration-200"
                  style={{ color: active ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.65)" }}
                >
                  {item.label}
                </a>
              );
            })}

            {ctaHref && ctaText ? (
              <a
                href={ctaHref}
                onClick={(e) => handleNavClick(e, ctaHref)}
                className="font-display text-micro uppercase tracking-[0.1em] font-bold px-8 py-3 rounded-full mt-4"
                style={{
                  backgroundColor: "hsl(var(--nav-cta-bg, 280 57% 16%))",
                  color: "hsl(var(--nav-cta-text, 45 60% 96%))",
                }}
              >
                {ctaText}
              </a>
            ) : null}

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
