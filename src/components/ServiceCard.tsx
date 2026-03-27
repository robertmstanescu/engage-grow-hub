import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useTagColors } from "@/hooks/useTagColors";

const Deliverables = ({ label, items }: { label: string; items: string[] }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t px-7 py-5" style={{ borderColor: "hsl(var(--foreground) / 0.08)", backgroundColor: "hsl(var(--background) / 0.3)" }}>
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full text-left">
        <span className="font-body text-[10px] tracking-[0.2em] uppercase" style={{ color: "hsl(var(--pillar-deliverables-label))" }}>{label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-500 ${open ? "rotate-180" : ""}`} style={{ color: "hsl(var(--foreground) / 0.25)" }} />
      </button>
      <motion.div initial={false} animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
        <ul className="space-y-2 pt-4">
          {items.map((item, i) => (
            <li key={i} className="font-body text-sm leading-snug pl-5 relative" style={{ color: "hsl(var(--foreground) / 0.6)" }}>
              <span className="absolute left-0 text-xs" style={{ color: "hsl(var(--accent) / 0.4)" }}>—</span>
              {item}
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
};

const ease = [0.16, 1, 0.3, 1] as const;

interface ServiceCardProps {
  tag: string; tagType: "fixed" | "retainer" | string; tagBgColor?: string; tagTextColor?: string;
  title: string; subtitle: string; description: string; deliverables: string[];
  deliverablesLabel?: string; price: string; time: string; note?: string;
}

const ServiceCard = ({ tag, tagType, tagBgColor, tagTextColor, title, subtitle, description, deliverables, deliverablesLabel = "What's inside", price, time, note }: ServiceCardProps) => {
  const { getTagColors } = useTagColors();
  const adminColors = getTagColors(tagType);
  const bgHex = tagBgColor || adminColors.bgColor;
  const fgHex = tagTextColor || adminColors.textColor;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease }}
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "hsl(260 25% 12% / 0.5)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid hsl(280 20% 25% / 0.35)",
        boxShadow: "0 8px 40px -10px hsl(280 55% 15% / 0.4), 0 0 60px -20px hsl(280 55% 30% / 0.15)",
      }}>
      <div className="p-7 md:p-8">
        <span className="inline-block font-body text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 rounded-full mb-5 font-medium" style={{ backgroundColor: bgHex, color: fgHex }}>{tag}</span>
        <h4 className="font-display text-lg md:text-xl font-bold leading-tight mb-1.5" style={{ color: "hsl(var(--pillar-card-title))" }}>{title}</h4>
        <p className="font-body-heading text-sm font-medium mb-5" style={{ color: "hsl(var(--pillar-subtitle))" }}>{subtitle}</p>
        <p className="font-body text-sm leading-relaxed" style={{ color: "hsl(var(--foreground) / 0.65)" }}>{description}</p>
      </div>
      <Deliverables label={deliverablesLabel} items={deliverables} />
      <div className="px-7 md:px-8 py-5 flex justify-between items-center flex-wrap gap-2" style={{ backgroundColor: "hsl(var(--background) / 0.3)" }}>
        <a href="#contact" className="font-display text-xs font-bold tracking-wide hover:opacity-80 transition-all duration-500" style={{ color: "hsl(var(--accent))" }}>{price} →</a>
        <span className="font-body text-xs tracking-wide" style={{ color: "hsl(var(--foreground) / 0.4)" }}>{time}</span>
      </div>
      {note && (
        <div className="mx-7 md:mx-8 my-5 px-4 py-3 rounded-lg" style={{ backgroundColor: "hsl(var(--background) / 0.4)", borderLeft: "2px solid hsl(var(--accent) / 0.3)" }}>
          <p className="font-body text-xs italic leading-relaxed" style={{ color: "hsl(var(--foreground) / 0.5)" }}>{note}</p>
        </div>
      )}
    </motion.div>
  );
};

export default ServiceCard;
