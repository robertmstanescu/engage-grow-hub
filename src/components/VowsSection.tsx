import { motion } from "framer-motion";

const vows = [
  {
    title: "Precision over pomp",
    body: "Our reports are as clear as a glass prism and as sharp as a stake. No buzzwords. No padding. No synergy.",
  },
  {
    title: "The human trace",
    body: "Behind every strategy is a handwritten insight. Your people are not capital. They are the life-force.",
  },
  {
    title: "Expansive horizons",
    body: "We don't just fix the room. We remove the ceiling. Every engagement is a door to something bigger.",
  },
];

const ease = [0.16, 1, 0.3, 1] as const;

const VowsSection = () => (
  <section id="vows" className="bg-secondary py-20 text-center">
    <div className="max-w-[800px] mx-auto px-6">
      <motion.h3
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease }}
        className="font-display text-xl md:text-2xl font-bold text-primary-foreground leading-tight mb-10"
      >
        Before we shake hands,
        <br />
        here is what we vow.
      </motion.h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {vows.map((vow, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.1, ease }}
            className="border border-accent/25 rounded-lg p-5 text-left"
          >
            <p className="font-body-heading text-sm font-bold text-accent mb-1.5">
              {vow.title}
            </p>
            <p className="font-body text-xs text-primary-foreground/55 leading-relaxed">
              {vow.body}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default VowsSection;
