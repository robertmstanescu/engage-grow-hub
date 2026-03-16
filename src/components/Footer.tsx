import { Instagram, Linkedin } from "lucide-react";

const Footer = () => (
  <footer
    className="scope-footer py-10 px-6"
    style={{ backgroundColor: "hsl(var(--footer-bg))" }}>
    <div className="max-w-[900px] mx-auto">
      {/* Social links */}
      <div className="flex justify-center gap-5 mb-6">
        <a
          href="https://www.instagram.com/themagiccoffin"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Follow us on Instagram"
          className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
          style={{
            border: "1px solid hsl(var(--footer-text) / 0.15)",
            color: "hsl(var(--footer-text) / 0.5)"
          }}>
          <Instagram size={18} />
        </a>
        <a
          href="https://www.linkedin.com/company/themagiccoffin"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Follow us on LinkedIn"
          className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
          style={{
            border: "1px solid hsl(var(--footer-text) / 0.15)",
            color: "hsl(var(--footer-text) / 0.5)"
          }}>
          <Linkedin size={18} />
        </a>
      </div>

      <p
        className="font-body text-xs text-center"
        style={{ color: "hsl(var(--footer-text) / 0.4)" }}>
        © {new Date().getFullYear()} The Magic Coffin for Silly Vampires. All rights reserved.
      </p>
      <p
        className="font-body text-[10px] mt-1 text-center"
        style={{ color: "hsl(var(--footer-text-sub) / 0.25)" }}>
        Based in Sweden · Operating globally
      </p>
    </div>
  </footer>
);

export default Footer;
