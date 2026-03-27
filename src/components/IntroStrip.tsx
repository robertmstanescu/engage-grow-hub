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
    <div
      className="scope-intro py-16 md:py-24 px-8 md:px-12"
      style={{ backgroundColor: "hsl(var(--intro-bg))" }}>
      <div className="max-w-[800px] mx-auto">
        {/* Ornamental divider */}
        <div className="ornamental-divider mb-12">
          <span className="ornament">✦</span>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease }}
          className="font-body-heading text-lg md:text-xl font-medium leading-relaxed text-center"
          style={{ color: "hsl(var(--intro-text))" }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.text) }}
        />
      </div>
    </div>
  );
};

export default IntroStrip;
