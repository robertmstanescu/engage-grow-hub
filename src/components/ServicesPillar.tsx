import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ServiceCard from "./ServiceCard";
import { sanitizeHtml } from "@/lib/sanitize";

const ease = [0.16, 1, 0.3, 1] as const;

interface Service {
  tag: string;
  tagType: "fixed" | "retainer" | string;
  tagBgColor?: string;
  tagTextColor?: string;
  title: string;
  subtitle: string;
  description: string;
  deliverables: string[];
  deliverablesLabel?: string;
  price: string;
  time: string;
  note?: string;
}

interface ServicesPillarProps {
  id?: string;
  colorScope?: string;
  pillarNumber: string;
  title: string;
  description: string;
  services: Service[];
  bgClass?: string;
}

const ServicesPillar = ({ id, colorScope, pillarNumber, title, description, services, bgClass }: ServicesPillarProps) => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  if (!services || services.length === 0) return null;
  const safeCurrent = Math.min(current, services.length - 1);

  const prev = () => {
    setDirection(-1);
    setCurrent((c) => c === 0 ? services.length - 1 : c - 1);
  };
  const next = () => {
    setDirection(1);
    setCurrent((c) => c === services.length - 1 ? 0 : c + 1);
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 })
  };

  return (
    <div id={id} className={colorScope || ""} style={{ scrollMarginTop: "4rem" }}>
      {/* Ornamental divider instead of flat gradient */}
      <div className="ornamental-divider py-2" style={{ backgroundColor: "hsl(var(--pillar-section-bg))" }}>
        <span className="ornament">✦</span>
      </div>

      <div className="pt-16 md:pt-24 pb-8" style={{ backgroundColor: "hsl(var(--pillar-section-bg))" }}>
        <div className="max-w-[900px] mx-auto px-8 md:px-12 text-center">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-body text-[10px] tracking-[0.3em] uppercase block mb-4"
            style={{ color: "hsl(var(--pillar-label))" }}>
            {pillarNumber}
          </motion.span>
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease }}
            className="font-display text-2xl md:text-4xl font-bold leading-tight mb-4"
            style={{ color: "hsl(var(--pillar-heading))" }}>
            {title}
          </motion.h3>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="font-body-heading text-base md:text-lg max-w-[700px] mx-auto leading-relaxed"
            style={{ color: "hsl(var(--pillar-heading-sub) / 0.65)" }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
          />
        </div>
      </div>

      <div className="px-8 md:px-12 pb-20 md:pb-28" style={{ backgroundColor: "hsl(var(--pillar-section-bg))" }}>
        <div className="max-w-[900px] mx-auto">
          <div className="flex items-center justify-center gap-4 mb-8">
            <button onClick={prev} aria-label="Previous service" className="w-10 h-10 rounded-full flex items-center justify-center transition-luxury" style={{ border: "1px solid hsl(var(--pillar-primary) / 0.2)", color: "hsl(var(--pillar-primary))" }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-2">
              {services.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setDirection(i > safeCurrent ? 1 : -1); setCurrent(i); }}
                  className="w-2 h-2 rounded-full transition-all duration-500"
                  style={{
                    backgroundColor: i === safeCurrent ? "hsl(var(--pillar-primary))" : "hsl(var(--pillar-primary) / 0.25)",
                    transform: i === safeCurrent ? "scale(1.4)" : "scale(1)"
                  }}
                  aria-label={`Go to service ${i + 1}`}
                />
              ))}
            </div>
            <button onClick={next} aria-label="Next service" className="w-10 h-10 rounded-full flex items-center justify-center transition-luxury" style={{ border: "1px solid hsl(var(--pillar-primary) / 0.2)", color: "hsl(var(--pillar-primary))" }}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="relative overflow-hidden">
            <AnimatePresence custom={direction} mode="wait">
              <motion.div
                key={safeCurrent}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.45, ease }}>
                <ServiceCard {...services[safeCurrent]} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicesPillar;
