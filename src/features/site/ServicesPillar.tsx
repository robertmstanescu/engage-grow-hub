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

  const prev = () => { setDirection(-1); setCurrent((c) => c === 0 ? services.length - 1 : c - 1); };
  const next = () => { setDirection(1); setCurrent((c) => c === services.length - 1 ? 0 : c + 1); };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <div id={id} data-section={id || "pillar"} className={`snap-section grain relative ${colorScope || ""}`} style={{ scrollMarginTop: "4rem", backgroundColor: "hsl(var(--pillar-section-bg))" }}>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-10 blur-[100px]"
        style={{ background: "radial-gradient(circle, hsl(286 42% 30%), transparent)" }} />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-8 blur-[120px]"
        style={{ background: "radial-gradient(circle, hsl(280 55% 25%), transparent)" }} />

      <div className="relative z-10 pt-20 md:pt-28 pb-8 px-3">
        <div className="max-w-[900px] mr-auto ml-0 text-left">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-body text-[10px] tracking-[0.35em] uppercase block mb-5"
            style={{ color: "hsl(var(--pillar-label))" }}>
            {pillarNumber}
          </motion.span>
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease }}
            className="font-display text-2xl md:text-4xl font-bold leading-tight mb-5"
            style={{ color: "hsl(var(--pillar-heading))" }}>
            {title}
          </motion.h3>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="font-body-heading text-base md:text-lg max-w-[600px] leading-relaxed"
            style={{ color: "hsl(var(--pillar-heading-sub) / 0.7)" }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
          />
        </div>
      </div>

      <div className="relative z-10 px-3 pb-24 md:pb-32">
        <div className="max-w-[900px] mr-auto ml-0">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={prev} className="btn-glass w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500" style={{ color: "hsl(var(--pillar-primary))" }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-2.5">
              {services.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setDirection(i > safeCurrent ? 1 : -1); setCurrent(i); }}
                  className="w-2 h-2 rounded-full transition-all duration-500"
                  style={{
                    backgroundColor: i === safeCurrent ? "hsl(var(--accent))" : "hsl(var(--foreground) / 0.15)",
                    transform: i === safeCurrent ? "scale(1.5)" : "scale(1)",
                    boxShadow: i === safeCurrent ? "0 0 12px hsl(46 75% 60% / 0.4)" : "none",
                  }}
                  aria-label={`Go to service ${i + 1}`}
                />
              ))}
            </div>
            <button onClick={next} className="btn-glass w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500" style={{ color: "hsl(var(--pillar-primary))" }}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="relative overflow-hidden">
            <AnimatePresence custom={direction} mode="wait">
              <motion.div key={safeCurrent} custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.45, ease }}>
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
