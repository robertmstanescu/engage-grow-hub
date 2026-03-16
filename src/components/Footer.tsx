const Footer = () => (
  <footer className="bg-secondary py-8 px-6 text-center">
    <p className="font-body text-xs text-primary-foreground/40">
      © {new Date().getFullYear()} The Magic Coffin for Silly Vampires. All rights reserved.
    </p>
    <p className="font-body text-[10px] text-primary-foreground/25 mt-1">
      Based in Sweden · Operating globally
    </p>
  </footer>
);

export default Footer;
