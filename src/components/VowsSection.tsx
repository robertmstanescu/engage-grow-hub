import { motion } from "framer-motion";
import { useSiteContent } from "@/hooks/useSiteContent";

const ease = [0.16, 1, 0.3, 1] as const;

interface VowsContent {
  title_line1: string;
  title_line2: string;
  cards: { title: string; body: string }[];
}

const fallback: VowsContent = {
  title_line1: "Before we shake hands,",
  title_line2: "here is what we vow.",
  cards: [
    { title: "Precision over pomp", body: "Our reports are as clear as a glass prism and as sharp as a stake. No buzzwords. No padding. No synergy." },
    { title: "The human trace", body: "Behind every strategy is a handwritten insight. Your people are not capital. They are the life-force." },
    { title: "Expansive horizons", body: "We don't just fix the room. We remove the ceiling. Every engagement is a door to something bigger." },
  ],
};

const VowsSection = () => {
  const c = useSiteContent<VowsContent>("vows", fallback);

  return (
    <section
      id="vows"
      className="scope-vows py-20 text-center"
      style={{ backgroundColor: "hsl(var(--vows-bg))" }}>
      <div className="max-w-[800px] mx-auto px-6">
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="font-display text-xl md:text-2xl font-bold leading-tight mb-10"
          style={{ color: "hsl(var(--vows-title))" }}>
          {c.title_line1}
          <br />
          {c.title_line2}
        </motion.h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {c.cards.map((vow, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1, ease }}
              className="rounded-lg p-5 text-left"
              style={{ border: "1px solid hsl(var(--vows-card-border) / 0.25)" }}>
              <p
                className="font-body-heading text-sm font-bold mb-1.5"
                style={{ color: "hsl(var(--vows-card-title))" }}>
                {vow.title}
              </p>
              <p
                className="font-body text-xs leading-relaxed"
                style={{ color: "hsl(var(--vows-card-body))" }}>
                {vow.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VowsSection;
