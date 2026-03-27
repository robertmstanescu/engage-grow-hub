import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ServiceCard from "@/components/ServiceCard";
import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/types/rows";
import { sanitizeHtml } from "@/lib/sanitize";
import EditableText from "@/components/admin/EditableText";
import SubscribeWidget from "@/components/SubscribeWidget";

const ease = [0.16, 1, 0.3, 1] as const;

const hexToHslChannels = (hex: string): string | null => {
  if (!hex || !hex.startsWith("#") || hex.length < 7) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `0 0% ${Math.round(l * 100)}%`;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const COLOR_MAP: Record<string, string> = {
  color_section_bg: "--pillar-section-bg", color_label: "--pillar-label", color_heading: "--pillar-heading",
  color_heading_sub: "--pillar-heading-sub", color_primary: "--pillar-primary", color_card_bg: "--pillar-card-bg",
  color_card_title: "--pillar-card-title", color_subtitle: "--pillar-subtitle", color_deliverables_bg: "--pillar-deliverables-bg",
  color_deliverables_label: "--pillar-deliverables-label", color_meta_bg: "--pillar-meta-bg", color_meta_fg: "--pillar-meta-fg",
  color_note_border: "--pillar-note-border", color_divider_from: "--pillar-divider-from", color_divider_to: "--pillar-divider-to",
};

const buildColorOverrides = (content: Record<string, any>): Record<string, string> => {
  const overrides: Record<string, string> = {};
  for (const [key, cssVar] of Object.entries(COLOR_MAP)) {
    const hex = content[key];
    if (hex) { const hsl = hexToHslChannels(hex); if (hsl) overrides[cssVar] = hsl; }
  }
  return overrides;
};

const ServiceRow = ({ row, rowIndex }: { row: PageRow; rowIndex?: number }) => {
  const c = row.content;
  const prefix = rowIndex !== undefined ? `rows.${rowIndex}.content` : "";
  const services = c.services || [];
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  if (!services.length) return null;
  const safeCurrent = Math.min(current, services.length - 1);
  const prev = () => { setDirection(-1); setCurrent((v) => v === 0 ? services.length - 1 : v - 1); };
  const next = () => { setDirection(1); setCurrent((v) => v === services.length - 1 ? 0 : v + 1); };
  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  const colorOverrides = buildColorOverrides(c);
  const l = { ...DEFAULT_ROW_LAYOUT, ...row.layout };

  return (
    <div className="snap-section grain relative" style={{ scrollMarginTop: "4rem", ...colorOverrides, backgroundColor: row.bg_color || "hsl(var(--pillar-section-bg))", marginTop: l.marginTop ? `${l.marginTop}px` : undefined, marginBottom: l.marginBottom ? `${l.marginBottom}px` : undefined } as React.CSSProperties}>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-10 blur-[100px]"
        style={{ background: "radial-gradient(circle, hsl(286 42% 30%), transparent)" }} />

      <div className="relative z-10" style={{ paddingTop: `${l.paddingTop}px`, paddingBottom: "24px" }}>
        <div className="max-w-[900px] mx-auto px-8 lg:pl-24 text-center">
          <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="font-body text-[10px] tracking-[0.35em] uppercase block mb-5" style={{ color: "hsl(var(--pillar-label))" }}>
            <EditableText sectionKey="page_rows" fieldPath={`${prefix}.pillar_number`} as="span">{c.pillar_number}</EditableText>
          </motion.span>
          <motion.h3 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease }}
            className="font-display text-2xl md:text-4xl font-bold leading-tight mb-5" style={{ color: "hsl(var(--pillar-heading))" }}>
            <EditableText sectionKey="page_rows" fieldPath={`${prefix}.title`} as="span">{c.title}</EditableText>
          </motion.h3>
          <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.1, ease }}>
            <EditableText sectionKey="page_rows" fieldPath={`${prefix}.description`} html as="div"
              className="font-body-heading text-base md:text-lg max-w-[600px] mx-auto leading-relaxed"
              style={{ color: "hsl(var(--pillar-heading-sub) / 0.6)" }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.description) }} />
          </motion.div>
        </div>
      </div>

      <div className="relative z-10 px-8 lg:pl-24" style={{ paddingBottom: `${l.paddingBottom}px` }}>
        <div className="max-w-[900px] mx-auto">
          <div className="flex items-center justify-center gap-4 mb-8">
            <button onClick={prev} className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 glass" style={{ color: "hsl(var(--pillar-primary))" }}><ChevronLeft className="w-4 h-4" /></button>
            <div className="flex gap-2.5">
              {services.map((_: any, i: number) => (
                <button key={i} onClick={() => { setDirection(i > safeCurrent ? 1 : -1); setCurrent(i); }}
                  className="w-2 h-2 rounded-full transition-all duration-500"
                  style={{ backgroundColor: i === safeCurrent ? "hsl(var(--accent))" : "hsl(var(--foreground) / 0.15)", transform: i === safeCurrent ? "scale(1.5)" : "scale(1)", boxShadow: i === safeCurrent ? "0 0 12px hsl(46 75% 60% / 0.4)" : "none" }} />
              ))}
            </div>
            <button onClick={next} className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 glass" style={{ color: "hsl(var(--pillar-primary))" }}><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="relative overflow-hidden">
            <AnimatePresence custom={direction} mode="wait">
              <motion.div key={safeCurrent} custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.45, ease }}>
                <ServiceCard {...services[safeCurrent]} />
              </motion.div>
            </AnimatePresence>
          </div>
          {c.show_subscribe && <div className="text-center mt-8"><SubscribeWidget /></div>}
        </div>
      </div>
    </div>
  );
};

export default ServiceRow;
