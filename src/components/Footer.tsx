const Footer = () => (
  <footer
    className="scope-footer py-8 px-6 text-center"
    style={{ backgroundColor: "hsl(var(--footer-bg))" }}>
    <p
      className="font-body text-xs"
      style={{ color: "hsl(var(--footer-text) / 0.4)" }}>
      © {new Date().getFullYear()} The Magic Coffin for Silly Vampires. All rights reserved.
    </p>
    <p
      className="font-body text-[10px] mt-1"
      style={{ color: "hsl(var(--footer-text-sub) / 0.25)" }}>
      Based in Sweden · Operating globally
    </p>
  </footer>
);

export default Footer;