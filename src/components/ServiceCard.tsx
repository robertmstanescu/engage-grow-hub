import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const Deliverables = ({ label, items }: {label: string;items: string[];}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-primary/8 px-7 py-4 bg-primary-foreground">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left">
        
        <span className="font-body text-[10px] tracking-[0.18em] uppercase text-primary/50">
          {label}
        </span>
        <ChevronDown className={`w-4 h-4 text-primary/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden">
        
        <ul className="space-y-1.5 pt-3">
          {items.map((item, i) =>
          <li key={i} className="font-body text-sm text-foreground/70 leading-snug pl-5 relative">
              <span className="absolute left-0 text-valentino text-xs">—</span>
              {item}
            </li>
          )}
        </ul>
      </motion.div>
    </div>);

};

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
  note
}: ServiceCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease }}
      className="border-[1.5px] border-primary/15 rounded-lg overflow-hidden">
      
      {/* Top */}
      <div className="p-7">
        <span
          className={`inline-block font-body text-[10px] tracking-[0.18em] uppercase px-2.5 py-1 rounded-full mb-4 font-medium ${
          tagType === "fixed" ?
          "bg-accent/20 text-accent-foreground" :
          "bg-primary/12 text-primary"}`
          }>
          
          {tag}
        </span>
        <h4 className="font-display text-lg font-bold leading-tight mb-1 text-[#2b0e34]">
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
      <div className="px-7 py-5 flex justify-between items-center flex-wrap gap-2 text-[#4e1c5f] bg-[#e4c44e]">
        <a href="#contact" className="font-display text-xs font-bold tracking-wide hover:opacity-80 transition-opacity text-[#4e1c5e]">
          {price} →
        </a>
        <span className="font-body text-xs text-primary-foreground/50 tracking-wide">
          {time}
        </span>
      </div>

      {/* Note */}
      {note &&
      <div className="bg-primary/[0.06] border-l-[3px] border-valentino rounded-r-lg mx-7 my-4 px-4 py-3">
          <p className="font-body text-xs text-foreground/65 italic leading-relaxed">{note}</p>
        </div>
      }
    </motion.div>);

};

export default ServiceCard;