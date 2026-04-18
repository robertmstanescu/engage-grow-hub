import { motion } from "framer-motion";
import { useSiteContent } from "@/hooks/useSiteContent";
import { sanitizeHtml } from "@/services/sanitize";

const ease = [0.16, 1, 0.3, 1] as const;

const fallback = {
  text: 'We work across two disciplines: <strong>Internal Communications</strong> and <strong>Employee Experience</strong>. Every engagement starts with the same question — where is the life being drained? — and ends with something that actually works.',
};

const IntroStrip = () => {
  const c = useSiteContent<{ text: string }>("intro", fallback);

  return (
    <div data-section="intro" className="snap-section section-light relative py-24 md:py-32 px-3">
      <div className="absolute inset-0 opacity-30 blur-[100px]" style={{ background: "radial-gradient(ellipse 80% 60% at 30% 70%, hsl(280 55% 24% / 0.2), transparent), radial-gradient(ellipse 60% 40% at 70% 30%, hsl(286 42% 30% / 0.15), transparent)" }} />

      <div className="relative z-10 max-w-[700px] mr-auto ml-0 text-left">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.15 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease }}
          className="text-5xl mb-8"
          style={{ color: "hsl(var(--primary))" }}>
          ✦
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease }}
          className="font-body-heading text-lg md:text-xl font-medium leading-relaxed"
          style={{ color: "hsl(var(--light-fg) / 0.85)" }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.text) }}
        />
      </div>
    </div>
  );
};

export default IntroStrip;
