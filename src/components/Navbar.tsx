import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSiteContent } from "@/hooks/useSiteContent";

const Navbar = () => {
  const branding = useSiteContent<Record<string, any>>("branding", {});
  const navConfig = useSiteContent<Record<string, any>>("navbar", {});
  const logoUrl = branding.logo_url || "/lovable-uploads/25c16e30-e0dd-4cbd-b9b7-02f72d962fb9.png";
  const [isOpen, setIsOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
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

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setIsOpen(false);
    setServicesOpen(false);

    if (href.startsWith("#")) {
      const id = href.slice(1);
      if (location.pathname === "/") {
        setTimeout(() => {
          const el = document.getElementById(id);
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 50);
      } else {
        // Use window.location for cross-page hash navigation
        window.location.href = "/" + href;
      }
    } else {
      navigate(href);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setServicesOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav
      className="scope-navbar fixed top-0 left-0 right-0 z-50 backdrop-blur-sm"
      style={{
        backgroundColor: "hsl(var(--nav-bg))",
        borderBottom: "1px solid hsl(var(--nav-border) / 0.2)"
      }}>
      <div className="max-w-[900px] mx-auto px-6 flex items-center justify-between h-16">
        <a href="/" className="flex items-center gap-2 min-w-0">
          <img alt="The Magic Coffin" className="h-8 brightness-200 object-fill border-0 shadow-none rounded-none flex-shrink-0" src={logoUrl} />
        </a>

        {/* Desktop — hidden below lg (1024px) */}
        <div className="hidden lg:flex items-center gap-8">
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setServicesOpen(!servicesOpen)}
              className="font-body text-xs uppercase tracking-[0.15em] font-semibold flex items-center gap-1 transition-colors duration-200"
              style={{ color: "hsl(var(--nav-text))" }}>
              {servicesLabel}
              <ChevronDown size={14} className={`transition-transform duration-200 ${servicesOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {servicesOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-2 w-56 rounded-lg shadow-lg overflow-hidden"
                  style={{
                    backgroundColor: "hsl(var(--nav-dropdown-bg))",
                    border: "1px solid hsl(var(--nav-border) / 0.2)"
                  }}>
                  {subLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      onClick={(e) => handleNavClick(e, link.href)}
                      className="block px-4 py-3 font-body text-xs uppercase tracking-[0.12em] transition-colors"
                      style={{ color: "hsl(var(--nav-text-muted) / 0.8)" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `hsl(var(--nav-dropdown-hover) / 0.2)`;
                        e.currentTarget.style.color = `hsl(var(--nav-text))`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = `hsl(var(--nav-text-muted) / 0.8)`;
                      }}>
                      {link.label}
                    </a>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="font-body text-xs uppercase tracking-[0.15em] transition-colors duration-200 font-semibold"
              style={{ color: "hsl(var(--nav-text))" }}>
              {link.label}
            </a>
          ))}
          {showBlogLink && (
            <a
              href="/blog"
              onClick={(e) => { e.preventDefault(); navigate("/blog"); }}
              className="font-body text-xs uppercase tracking-[0.15em] transition-colors duration-200 font-semibold"
              style={{ color: "hsl(var(--nav-text))" }}>
              Blog
            </a>
          )}
          <a
            href={ctaHref}
            onClick={(e) => handleNavClick(e, ctaHref)}
            className="font-display text-[10px] uppercase tracking-[0.08em] font-bold px-5 py-2.5 rounded-full hover:opacity-85 transition-opacity"
            style={{
              backgroundColor: "hsl(var(--nav-cta-bg))",
              color: "hsl(var(--nav-cta-text))"
            }}>
            {ctaText}
          </a>
        </div>

        {/* Mobile/Tablet toggle — visible below lg */}
        <div className="flex lg:hidden items-center gap-4">
          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{ color: "hsl(var(--nav-text) / 0.7)" }}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden overflow-hidden"
            style={{ backgroundColor: "hsl(var(--nav-dropdown-bg))" }}>
            <div className="px-6 py-4 flex flex-col gap-4">
              <span className="font-body text-[10px] uppercase tracking-[0.15em]" style={{ color: "hsl(var(--nav-text) / 0.4)" }}>{servicesLabel}</span>
              {subLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="font-body text-xs uppercase tracking-[0.12em] transition-colors pl-3"
                  style={{ color: "hsl(var(--nav-text) / 0.6)" }}>
                  {link.label}
                </a>
              ))}
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="font-body text-xs uppercase tracking-[0.15em] transition-colors"
                  style={{ color: "hsl(var(--nav-text) / 0.6)" }}>
                  {link.label}
                </a>
              ))}
              {showBlogLink && (
                <a
                  href="/blog"
                  onClick={(e) => { e.preventDefault(); setIsOpen(false); navigate("/blog"); }}
                  className="font-body text-xs uppercase tracking-[0.15em] transition-colors"
                  style={{ color: "hsl(var(--nav-text) / 0.6)" }}>
                  Blog
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
