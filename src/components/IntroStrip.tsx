import { motion } from "framer-motion";
import { useSiteContent } from "@/hooks/useSiteContent";
import { sanitizeHtml } from "@/lib/sanitize";

const ease = [0.16, 1, 0.3, 1] as const;

const fallback = {
  text: 'We work across two disciplines: <strong>Internal Communications</strong> and <strong>Employee Experience</strong>. Every engagement starts with the same question — where is the life being drained? — and ends with something that actually works.',
};

const IntroStrip = () => {
  const c = useSiteContent<{ text: string }>("intro", fallback);

  return (
    <div className="snap-section section-light relative py-24 md:py-32 px-8 lg:pl-24">
      <div className="max-w-[700px] mx-auto text-center">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.15 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease }}
          className="text-5xl mb-8"
          style={{ color: "hsl(var(--accent))" }}>
          ✦
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease }}
          className="font-body-heading text-lg md:text-xl font-medium leading-relaxed"
          style={{ color: "hsl(var(--light-fg))" }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.text) }}
        />
      </div>
    </div>
  );
};

export default IntroStrip;
