import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ServiceCard from "./ServiceCard";

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

  // Guard against empty services
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
      <div className="gradient-divider" />
      <div className="pt-12 pb-6" style={{ backgroundColor: "hsl(var(--pillar-section-bg))" }}>
        <div className="max-w-[900px] mx-auto px-6 text-center">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-body text-[11px] tracking-[0.2em] uppercase block mb-3"
            style={{ color: "hsl(var(--pillar-label))" }}>
            {pillarNumber}
          </motion.span>
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
            className="font-display text-2xl md:text-3xl font-bold leading-tight mb-3"
            style={{ color: "hsl(var(--pillar-heading))" }}>
            {title}
          </motion.h3>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
            className="font-body-heading text-base max-w-[700px] mx-auto"
            style={{ color: "hsl(var(--pillar-heading-sub) / 0.65)" }}
            dangerouslySetInnerHTML={{ __html: description }}
          />
        </div>
      </div>
      <div className="px-6 pb-16" style={{ backgroundColor: "hsl(var(--pillar-section-bg))" }}>
        <div className="max-w-[900px] mx-auto">
          <div className="flex items-center justify-center gap-4 mb-6">
            <button onClick={prev} aria-label="Previous service" className="w-9 h-9 rounded-full flex items-center justify-center transition-colors" style={{ border: "1px solid hsl(var(--pillar-primary) / 0.2)", color: "hsl(var(--pillar-primary))" }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-2">
              {services.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setDirection(i > safeCurrent ? 1 : -1); setCurrent(i); }}
                  className="w-2 h-2 rounded-full transition-all"
                  style={{
                    backgroundColor: i === safeCurrent ? "hsl(var(--pillar-primary))" : "hsl(var(--pillar-primary) / 0.25)",
                    transform: i === safeCurrent ? "scale(1.25)" : "scale(1)"
                  }}
                  aria-label={`Go to service ${i + 1}`}
                />
              ))}
            </div>
            <button onClick={next} aria-label="Next service" className="w-9 h-9 rounded-full flex items-center justify-center transition-colors" style={{ border: "1px solid hsl(var(--pillar-primary) / 0.2)", color: "hsl(var(--pillar-primary))" }}>
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
                transition={{ duration: 0.35, ease }}>
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
