import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.jpg";
import { Menu, X } from "lucide-react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { label: "Services", href: "#services" },
    { label: "Our Vows", href: "#vows" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-secondary/95 backdrop-blur-sm border-b border-primary/20">
      <div className="max-w-[900px] mx-auto px-6 flex items-center justify-between h-16">
        <a href="#" className="flex items-center gap-2">
          <img src={logo} alt="The Magic Coffin" className="h-8 brightness-200" />
        </a>
        
        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="font-body text-xs uppercase tracking-[0.15em] text-primary-foreground/60 hover:text-accent transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#contact"
            className="font-display text-[10px] uppercase tracking-[0.08em] font-bold bg-accent text-accent-foreground px-5 py-2.5 rounded-full hover:opacity-85 transition-opacity"
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
