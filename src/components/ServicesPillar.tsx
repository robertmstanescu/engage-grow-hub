import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ServiceCard from "./ServiceCard";

const ease = [0.16, 1, 0.3, 1] as const;

interface Service {
  tag: string;
  tagType: "fixed" | "retainer";
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
  pillarNumber: string;
  title: string;
  description: string;
  services: Service[];
  bgClass?: string;
}

const ServicesPillar = ({ pillarNumber, title, description, services, bgClass = "bg-card" }: ServicesPillarProps) => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const prev = () => {
    setDirection(-1);
    setCurrent((c) => (c === 0 ? services.length - 1 : c - 1));
  };
  const next = () => {
    setDirection(1);
    setCurrent((c) => (c === services.length - 1 ? 0 : c + 1));
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <>
      <div className="gradient-divider" />
      <div className={`${bgClass} pt-16 pb-4`}>
        <div className="max-w-[900px] mx-auto px-6 text-center">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-body text-[11px] tracking-[0.2em] uppercase text-valentino block mb-3"
          >
            {pillarNumber}
          </motion.span>
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
            className="font-display text-2xl md:text-3xl font-bold text-secondary leading-tight mb-3"
          >
            {title}
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
            className="font-body-heading text-base text-secondary/65 max-w-[700px] mx-auto"
          >
            {description}
          </motion.p>
        </div>
      </div>
      <div className={`${bgClass} px-6 pb-16`}>
        <div className="max-w-[900px] mx-auto">
          {/* Dots + Arrows */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={prev}
              aria-label="Previous service"
              className="w-9 h-9 rounded-full border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-2">
              {services.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
                  className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-primary scale-125" : "bg-primary/25"}`}
                  aria-label={`Go to service ${i + 1}`}
                />
              ))}
            </div>
            <button
              onClick={next}
              aria-label="Next service"
              className="w-9 h-9 rounded-full border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Sliding card */}
          <div className="relative overflow-hidden">
            <AnimatePresence custom={direction} mode="wait">
              <motion.div
                key={current}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease }}
              >
                <ServiceCard {...services[current]} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
};

export default ServicesPillar;
