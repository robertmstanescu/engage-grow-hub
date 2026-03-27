import { motion } from "framer-motion";
import { useSiteContent } from "@/hooks/useSiteContent";
import { sanitizeHtml } from "@/lib/sanitize";

const ease = [0.16, 1, 0.3, 1] as const;
const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

interface VowsContent {
  title_line1?: string;
  title_line2?: string;
  title_lines?: any[];
  cards: { title: string; body: string }[];
}

const fallback: VowsContent = {
  title_lines: ["<p>Before we shake hands,</p>", "<p>here is what we vow.</p>"],
  cards: [
    { title: "Precision over pomp", body: "Our reports are as clear as a glass prism and as sharp as a stake. No buzzwords. No padding. No synergy." },
    { title: "The human trace", body: "Behind every strategy is a handwritten insight. Your people are not capital. They are the life-force." },
    { title: "Expansive horizons", body: "We don't just fix the room. We remove the ceiling. Every engagement is a door to something bigger." },
  ],
};

const VowsSection = () => {
  const c = useSiteContent<VowsContent>("vows", fallback);

  const titleLines: string[] = (c.title_lines || [c.title_line1 || "", c.title_line2 || ""]).map(
    (l: any) => (typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`)
  );

  return (
    <section
      id="vows"
      className="scope-vows grain-overlay py-28 md:py-36 text-center"
      style={{ backgroundColor: "hsl(var(--vows-bg))" }}>
      <div className="relative z-10 max-w-[900px] mx-auto px-8 md:px-12">
        {/* Ornamental divider */}
        <div className="ornamental-divider mb-14">
          <span className="ornament">✦</span>
        </div>

        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease }}
          className="font-display text-2xl md:text-3xl lg:text-4xl font-bold leading-tight mb-14"
          style={{ color: "hsl(var(--vows-title))" }}>
          {titleLines.map((line, i) => (
            <span key={i}>
              {i > 0 && <br />}
              <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} />
            </span>
          ))}
        </motion.h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {c.cards.map((vow, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.12, ease }}
              className="rounded-lg p-6 md:p-7 text-left"
              style={{ border: "1px solid hsl(var(--vows-card-border) / 0.2)" }}>
              <p
                className="font-body-heading text-sm font-bold mb-2"
                style={{ color: "hsl(var(--vows-card-title))" }}>
                {vow.title}
              </p>
              <div
                className="font-body text-xs leading-relaxed"
                style={{ color: "hsl(var(--vows-card-body))", opacity: 0.85 }}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(vow.body) }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VowsSection;
