import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSiteContent } from "@/hooks/useSiteContent";

const ease = [0.16, 1, 0.3, 1] as const;

const Navbar = () => {
  const branding = useSiteContent<Record<string, any>>("branding", {});
  const navConfig = useSiteContent<Record<string, any>>("navbar", {});
  const logoUrl = branding.logo_url || "/lovable-uploads/25c16e30-e0dd-4cbd-b9b7-02f72d962fb9.png";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const servicesLabel = navConfig.services_label || "Services";
  const subLinks = (navConfig.sub_links || [
    { label: "Internal Communications", href: "#internal-communications" },
    { label: "Employee Experience", href: "#employee-experience" },
  ]).map((l: any) => ({ label: l.label, href: l.href }));
  const links = (navConfig.links || [
    { label: "Our Vows", href: "#vows" },
    { label: "Contact", href: "#contact" },
  ]).map((l: any) => ({ label: l.label, href: l.href }));
  const showBlogLink = navConfig.show_blog_link !== false;
  const ctaText = navConfig.cta_text || "Book a consultation";
  const ctaHref = navConfig.cta_href || "#contact";

  // Build all nav items for the side rail
  const allItems = [
    ...subLinks.map((l: any) => ({ label: l.label, href: l.href })),
    ...links.map((l: any) => ({ label: l.label, href: l.href })),
    ...(showBlogLink ? [{ label: "Blog", href: "/blog" }] : []),
  ];

  // Track active section on scroll (homepage only)
  const handleScroll = useCallback(() => {
    if (location.pathname !== "/") return;
    const sections = allItems
      .filter((item) => item.href.startsWith("#"))
      .map((item) => item.href.slice(1));

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
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const handleNavClick = (e: React.MouseEvent<HTMLElement>, href: string) => {
    e.preventDefault();
    setMobileOpen(false);

    if (href.startsWith("#")) {
      const id = href.slice(1);
      if (location.pathname === "/") {
        setTimeout(() => {
          const el = document.getElementById(id);
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 50);
      } else {
        window.location.href = "/" + href;
      }
    } else if (href.startsWith("/")) {
      navigate(href);
    }
  };

  const isActive = (href: string) => {
    if (href.startsWith("#")) return activeSection === href.slice(1);
    return location.pathname === href;
  };

  return (
    <>
      {/* ── Desktop side navigation ── hidden below lg */}
      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 z-50 w-16 flex-col items-center py-6 gap-6"
        style={{ backgroundColor: "hsl(var(--background) / 0.8)", backdropFilter: "blur(12px)", borderRight: "1px solid hsl(var(--border) / 0.3)" }}>
        {/* Logo */}
        <a href="/" className="mb-4">
          <img alt="Logo" className="w-8 h-8 object-contain brightness-200" src={logoUrl} />
        </a>

        {/* Rotated labels */}
        <div className="flex-1 flex flex-col items-center justify-center gap-5">
          {allItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              className="side-nav-label font-body"
              style={{
                color: isActive(item.href) ? "hsl(var(--accent))" : "hsl(var(--foreground) / 0.35)",
                fontWeight: isActive(item.href) ? 600 : 400,
              }}>
              {item.label}
            </a>
          ))}
        </div>

        {/* CTA dot */}
        <a
          href={ctaHref}
          onClick={(e) => handleNavClick(e, ctaHref)}
          title={ctaText}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500 hover:scale-110"
          style={{ backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}>
          →
        </a>
      </nav>

      {/* ── Mobile top bar ── visible below lg */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-5"
        style={{ backgroundColor: "hsl(var(--background) / 0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid hsl(var(--border) / 0.2)" }}>
        <a href="/" className="flex items-center">
          <img alt="Logo" className="h-7 brightness-200 object-contain" src={logoUrl} />
        </a>
        <button onClick={() => setMobileOpen(!mobileOpen)} style={{ color: "hsl(var(--foreground) / 0.7)" }}>
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
            style={{ backgroundColor: "hsl(var(--background) / 0.95)", backdropFilter: "blur(20px)" }}>
            {allItems.map((item, i) => (
              <motion.a
                key={item.label}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06, ease }}
                className="font-body text-sm uppercase tracking-[0.2em] transition-colors duration-500"
                style={{ color: isActive(item.href) ? "hsl(var(--accent))" : "hsl(var(--foreground) / 0.5)" }}>
                {item.label}
              </motion.a>
            ))}
            <motion.a
              href={ctaHref}
              onClick={(e) => handleNavClick(e, ctaHref)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: allItems.length * 0.06, ease }}
              className="font-display text-[11px] uppercase tracking-[0.1em] font-bold px-8 py-3 rounded-full mt-4"
              style={{ backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}>
              {ctaText}
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
