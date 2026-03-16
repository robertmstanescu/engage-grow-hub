import { motion } from "framer-motion";
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
        <div className="max-w-[900px] mx-auto space-y-6">
          {services.map((service, i) => (
            <ServiceCard key={i} {...service} />
          ))}
        </div>
      </div>
    </>
  );
};

export default ServicesPillar;
