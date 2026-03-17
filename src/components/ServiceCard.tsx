import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useTagColors } from "@/hooks/useTagColors";

const Deliverables = ({ label, items }: {label: string;items: string[];}) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border-t px-7 py-4"
      style={{
        borderColor: "hsl(var(--pillar-primary) / 0.08)",
        backgroundColor: "hsl(var(--pillar-deliverables-bg))"
      }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left">
        <span
          className="font-body text-[10px] tracking-[0.18em] uppercase text-secondary"
          style={{ color: "hsl(var(--pillar-deliverables-label))" }}>
          {label}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          style={{ color: "hsl(var(--pillar-primary) / 0.4)" }} />
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden">
        <ul className="space-y-1.5 pt-3">
          {items.map((item, i) =>
          <li key={i} className="font-body text-sm text-foreground/70 leading-snug pl-5 relative">
              <span className="absolute left-0 text-xs" style={{ color: "hsl(var(--pillar-subtitle))" }}>—</span>
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

const ServiceCard = ({
  tag,
  tagType,
  tagBgColor,
  tagTextColor,
  title,
  subtitle,
  description,
  deliverables,
  deliverablesLabel = "What's inside",
  price,
  time,
  note
}: ServiceCardProps) => {
  const { getTagColors } = useTagColors();
  const adminColors = getTagColors(tagType);

  // Priority: per-card overrides > admin tags_config > defaults
  const bgHex = tagBgColor || adminColors.bgColor;
  const fgHex = tagTextColor || adminColors.textColor;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease }}
      className="rounded-lg overflow-hidden"
      style={{
        border: "1.5px solid hsl(var(--pillar-primary) / 0.15)",
        backgroundColor: "hsl(var(--pillar-card-bg))"
      }}>
      
      {/* Top */}
      <div className="p-7">
        <span
          className="inline-block font-body text-[10px] tracking-[0.18em] uppercase px-2.5 py-1 rounded-full mb-4 font-medium"
          style={{
            backgroundColor: bgHex,
            color: fgHex
          }}>
          {tag}
        </span>
        <h4
          className="font-display text-lg font-bold leading-tight mb-1"
          style={{ color: "hsl(var(--pillar-card-title))" }}>
          {title}
        </h4>
        <p
          className="font-body-heading text-sm font-medium mb-4"
          style={{ color: "hsl(var(--pillar-subtitle))" }}>
          {subtitle}
        </p>
        <p className="font-body text-sm text-foreground/75 leading-relaxed">
          {description}
        </p>
      </div>

      {/* Deliverables (collapsible) */}
      <Deliverables label={deliverablesLabel} items={deliverables} />

      {/* Meta */}
      <div
        className="px-7 py-5 flex justify-between items-center flex-wrap gap-2"
        style={{
          backgroundColor: "hsl(var(--pillar-meta-bg))",
          color: "hsl(var(--pillar-meta-fg))"
        }}>
        <a
          href="#contact"
          className="font-display text-xs font-bold tracking-wide hover:opacity-80 transition-opacity"
          style={{ color: "hsl(var(--pillar-meta-fg))" }}>
          {price} →
        </a>
        <span
          className="font-body text-xs tracking-wide"
          style={{ color: "hsl(var(--pillar-meta-fg))" }}>
          {time}
        </span>
      </div>

      {/* Note */}
      {note &&
      <div
        className="rounded-r-lg mx-7 my-4 px-4 py-3"
        style={{
          backgroundColor: "hsl(var(--pillar-primary) / 0.06)",
          borderLeft: "3px solid hsl(var(--pillar-note-border))"
        }}>
          <p className="font-body text-xs text-foreground/65 italic leading-relaxed">{note}</p>
        </div>
      }
    </motion.div>);
};

export default ServiceCard;