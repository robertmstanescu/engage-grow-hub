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
    <section id="vows" className="snap-section grain relative py-32 md:py-40" style={{ backgroundColor: "hsl(var(--vows-bg))" }}>
      <div className="absolute inset-0 opacity-60" style={{
        background: "radial-gradient(ellipse 80% 60% at 10% 90%, hsl(280 55% 18% / 0.6), transparent), radial-gradient(ellipse 60% 50% at 80% 20%, hsl(286 42% 20% / 0.4), transparent), radial-gradient(ellipse 50% 40% at 50% 50%, hsl(46 75% 60% / 0.04), transparent)"
      }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-10 blur-[150px]"
        style={{ background: "radial-gradient(circle, hsl(46 75% 60%), transparent)" }} />

      <div className="relative z-10 max-w-[900px] mr-auto ml-0 px-3 text-left">
          <motion.h3
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease }}
          className="font-display text-2xl md:text-4xl lg:text-5xl font-bold leading-tight mb-16"
          style={{ color: (c as any).color_title || "hsl(var(--vows-title))" }}>
          {titleLines.map((line, i) => (
            <span key={i}>
              {i > 0 && <br />}
              <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} />
            </span>
          ))}
        </motion.h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {c.cards.map((vow, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.15, ease }}
              className="rounded-xl p-7 text-left"
              style={{
                backgroundColor: "hsl(260 25% 12% / 0.5)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid hsl(280 20% 25% / 0.35)",
                boxShadow: "0 8px 40px -10px hsl(280 55% 15% / 0.4)",
              }}>
              <p className="font-body-heading text-sm font-bold mb-3" style={{ color: "hsl(var(--vows-card-title))" }}>{vow.title}</p>
              <div className="font-body text-xs leading-relaxed" style={{ color: "hsl(var(--vows-card-body))" }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(vow.body) }} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VowsSection;
