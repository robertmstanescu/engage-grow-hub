import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;
interface ServiceCardProps {
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

const ServiceCard = ({
  tag,
  tagType,
  title,
  subtitle,
  description,
  deliverables,
  deliverablesLabel = "What's inside",
  price,
  time,
  note,
}: ServiceCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease }}
      className="border-[1.5px] border-primary/15 rounded-lg overflow-hidden"
    >
      {/* Top */}
      <div className="p-7">
        <span
          className={`inline-block font-body text-[10px] tracking-[0.18em] uppercase px-2.5 py-1 rounded-full mb-4 font-medium ${
            tagType === "fixed"
              ? "bg-accent/20 text-accent-foreground"
              : "bg-primary/12 text-primary"
          }`}
        >
          {tag}
        </span>
        <h4 className="font-display text-lg font-bold text-secondary leading-tight mb-1">
          {title}
        </h4>
        <p className="font-body-heading text-sm text-valentino font-medium mb-4">
          {subtitle}
        </p>
        <p className="font-body text-sm text-foreground/75 leading-relaxed">
          {description}
        </p>
      </div>

      {/* Deliverables (collapsible) */}
      <Deliverables label={deliverablesLabel} items={deliverables} />

      {/* Meta */}
      <div className="bg-secondary px-7 py-5 flex justify-between items-center flex-wrap gap-2">
        <a href="#contact" className="font-display text-xs text-accent font-bold tracking-wide hover:opacity-80 transition-opacity">
          {price} →
        </a>
        <span className="font-body text-xs text-primary-foreground/50 tracking-wide">
          {time}
        </span>
      </div>

      {/* Note */}
      {note && (
        <div className="bg-primary/[0.06] border-l-[3px] border-valentino rounded-r-lg mx-7 my-4 px-4 py-3">
          <p className="font-body text-xs text-foreground/65 italic leading-relaxed">{note}</p>
        </div>
      )}
    </motion.div>
  );
};

export default ServiceCard;
