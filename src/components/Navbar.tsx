import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown } from "lucide-react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const subLinks = [
    { label: "Internal Communications", href: "#internal-comms" },
    { label: "Employee Experience", href: "#employee-experience" },
  ];

  const links = [
    { label: "Our Vows", href: "#vows" },
    { label: "Contact", href: "#contact" },
  ];

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
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b border-primary/20 bg-[#2b0e34]">
      <div className="max-w-[900px] mx-auto px-6 flex items-center justify-between h-16">
        <a href="#" className="flex items-center gap-2">
          <img alt="The Magic Coffin" className="h-8 brightness-200 object-fill border-0 shadow-none rounded-none" src="/lovable-uploads/25c16e30-e0dd-4cbd-b9b7-02f72d962fb9.png" />
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {/* Services dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setServicesOpen(!servicesOpen)}
              className="font-body text-xs uppercase tracking-[0.15em] font-semibold text-white flex items-center gap-1 transition-colors duration-200"
            >
              Services
              <ChevronDown size={14} className={`transition-transform duration-200 ${servicesOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {servicesOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-2 w-56 rounded-lg border border-primary/20 bg-secondary shadow-lg overflow-hidden"
                >
                  {subLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      onClick={() => setServicesOpen(false)}
                      className="block px-4 py-3 font-body text-xs uppercase tracking-[0.12em] text-white/80 hover:bg-primary/20 hover:text-white transition-colors"
                    >
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
              className="font-body text-xs uppercase tracking-[0.15em] transition-colors duration-200 font-semibold text-white"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#contact"
            className="font-display text-[10px] uppercase tracking-[0.08em] font-bold px-5 py-2.5 rounded-full hover:opacity-85 transition-opacity text-white bg-[#7c3a92]"
          >
            Book a consultation
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-primary-foreground/70"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-secondary overflow-hidden"
          >
            <div className="px-6 py-4 flex flex-col gap-4">
              <span className="font-body text-[10px] uppercase tracking-[0.15em] text-white/40">Services</span>
              {subLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="font-body text-xs uppercase tracking-[0.12em] text-primary-foreground/60 hover:text-accent transition-colors pl-3"
                >
                  {link.label}
                </a>
              ))}
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="font-body text-xs uppercase tracking-[0.15em] text-primary-foreground/60 hover:text-accent transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="#contact"
                onClick={() => setIsOpen(false)}
                className="font-display text-[10px] uppercase tracking-[0.08em] font-bold bg-accent text-accent-foreground px-5 py-2.5 rounded-full text-center hover:opacity-85 transition-opacity"
              >
                Book a consultation
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
