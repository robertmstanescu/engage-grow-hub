import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ServiceCard from "@/components/ServiceCard";
import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/types/rows";
import { sanitizeHtml } from "@/lib/sanitize";
import EditableText from "@/components/admin/EditableText";
import SubscribeWidget from "@/components/SubscribeWidget";
import type { Alignment } from "./PageRows";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";

const ease = [0.16, 1, 0.3, 1] as const;

const hexToHslChannels = (hex: string): string | null => {
  if (!hex || !hex.startsWith("#") || hex.length < 7) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const li = (max + min) / 2;
  if (max === min) return `0 0% ${Math.round(li * 100)}%`;
  const d = max - min;
  const s = li > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(li * 100)}%`;
};

const COLOR_MAP: Record<string, string> = {
  color_section_bg: "--pillar-section-bg", color_label: "--pillar-label", color_heading: "--pillar-heading",
  color_heading_sub: "--pillar-heading-sub", color_primary: "--pillar-primary", color_card_bg: "--pillar-card-bg",
  color_card_title: "--pillar-card-title", color_subtitle: "--pillar-subtitle", color_card_description: "--pillar-card-description",
  color_deliverables_bg: "--pillar-deliverables-bg",
  color_deliverables_label: "--pillar-deliverables-label", color_meta_bg: "--pillar-meta-bg", color_meta_fg: "--pillar-meta-fg",
  color_cta_text: "--pillar-cta-text", color_cta_time: "--pillar-cta-time",
  color_carousel_btn_bg: "--pillar-carousel-btn-bg", color_carousel_btn_fg: "--pillar-carousel-btn-fg",
  color_dot_active: "--pillar-dot-active", color_dot_inactive: "--pillar-dot-inactive",
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

const ServiceRow = ({ row, rowIndex, align = "center" }: { row: PageRow; rowIndex?: number; align?: Alignment }) => {
  const c = row.content;
  const prefix = rowIndex !== undefined ? `rows.${rowIndex}.content` : "";
  const services = c.services || [];
  const [current, setCurrent] = useState(0);

  const { ref, isVisible } = useScrollReveal();

  if (!services.length) return null;
  const safeCurrent = Math.min(current, services.length - 1);
  const prev = () => setCurrent((v) => v === 0 ? services.length - 1 : v - 1);
  const next = () => setCurrent((v) => v === services.length - 1 ? 0 : v + 1);
  const variants = { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } };

  const colorOverrides = buildColorOverrides(c);
  const l = { ...DEFAULT_ROW_LAYOUT, ...row.layout };

  const gradStart = l.gradientStart || "hsl(286 42% 30%)";
  const gradEnd = l.gradientEnd || "hsl(280 55% 25%)";

  const carouselTheme = l.carouselTheme || "auto";
  const isDarkBg = !row.bg_color || row.bg_color.includes("#2") || row.bg_color.includes("#1") || row.bg_color.includes("#0") || row.bg_color.includes("#3") || row.bg_color.includes("#4") || row.bg_color.includes("#5");
  const isLightCarousel = carouselTheme === "light" || (carouselTheme === "auto" && isDarkBg);
  const carouselBtnBg = c.color_carousel_btn_bg || (isLightCarousel ? "hsl(0 0% 100% / 0.15)" : "hsl(0 0% 0% / 0.1)");
  const carouselBtnColor = c.color_carousel_btn_fg || (isLightCarousel ? "hsl(0 0% 100% / 0.9)" : "hsl(0 0% 0% / 0.7)");
  const carouselBtnBorder = isLightCarousel ? "hsl(0 0% 100% / 0.2)" : "hsl(0 0% 0% / 0.15)";
  const dotActive = c.color_dot_active || (isLightCarousel ? "hsl(var(--accent))" : "hsl(var(--primary))");
  const dotInactive = c.color_dot_inactive || (isLightCarousel ? "hsl(0 0% 100% / 0.2)" : "hsl(0 0% 0% / 0.15)");

  // Row alignment: positions the entire widget on the screen
  const rowTextAlign = align === "right" ? "text-right" : align === "left" ? "text-left" : "text-center";
  const rowContentAlign = align === "right" ? "ml-auto mr-0" : align === "left" ? "mr-auto ml-0" : "mx-auto";
  const carouselJustify = align === "right" ? "justify-end" : align === "left" ? "justify-start" : "justify-center";

  // Card content alignment: independent toggle for text inside cards
  const cardTextAlign = (c.card_text_align as "left" | "center" | "right") || "left";

  return (
    <div
      ref={ref}
      className="service-row grain relative flex items-center justify-center"
      style={{ ...colorOverrides, backgroundColor: row.bg_color || "hsl(var(--pillar-section-bg))", isolation: "isolate", padding: "24px 0" } as React.CSSProperties}
    >
      {/* Ambient glows — positioned absolutely, won't affect centering */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-10 blur-[100px]"
        style={{ background: `radial-gradient(circle, ${gradStart}, transparent)` }} />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-8 blur-[120px]"
        style={{ background: `radial-gradient(circle, ${gradEnd}, transparent)` }} />

      {/* Row-level alignment wrapper — controls position of the whole widget */}
      <div className={`relative z-10 w-full max-w-[900px] ${rowContentAlign} px-6 ${rowTextAlign}`}>
      {/* Pillar header — color_label and color_heading are independent */}
        <span className="font-body tracking-[0.35em] uppercase block mb-4"
          style={{ ...revealStyle(isVisible, 0), color: c.color_label || "hsl(var(--pillar-label))", fontSize: "clamp(7px, 0.9vw, 10px)" }}>
          <EditableText sectionKey="page_rows" fieldPath={`${prefix}.pillar_number`} as="span">{c.pillar_number}</EditableText>
        </span>

        <h3 className="font-display font-bold leading-tight mb-4"
          style={{ ...revealStyle(isVisible, 1), color: c.color_heading || "hsl(var(--pillar-heading))", fontSize: "clamp(1.2rem, 3.5vw, 2.2rem)" }}>
          <EditableText sectionKey="page_rows" fieldPath={`${prefix}.title`} as="span">{c.title}</EditableText>
        </h3>

        <div className="mb-6" style={revealStyle(isVisible, 2)}>
          <EditableText sectionKey="page_rows" fieldPath={`${prefix}.description`} html as="div"
            className={`font-body-heading max-w-[600px] ${rowContentAlign} leading-relaxed`}
            style={{ color: "hsl(var(--pillar-heading-sub) / 0.7)", fontSize: "clamp(0.75rem, 1.5vw, 1rem)", overflow: "visible", height: "auto" }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.description || "") }} />
        </div>

        {/* Carousel controls */}
        <div className={`flex items-center ${carouselJustify} gap-3 mb-5`} style={revealStyle(isVisible, 3)}>
          <button onClick={prev} className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500 backdrop-blur-sm" style={{ backgroundColor: carouselBtnBg, color: carouselBtnColor, border: `1px solid ${carouselBtnBorder}` }}><ChevronLeft className="w-4 h-4" /></button>
          <div className="flex gap-2.5">
            {services.map((_: any, i: number) => (
              <button key={i} onClick={() => setCurrent(i)}
                className="w-2 h-2 rounded-full transition-all duration-500"
                style={{ backgroundColor: i === safeCurrent ? dotActive : dotInactive, transform: i === safeCurrent ? "scale(1.5)" : "scale(1)", boxShadow: i === safeCurrent ? `0 0 12px ${dotActive}` : "none" }} />
            ))}
          </div>
          <button onClick={next} className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500 backdrop-blur-sm" style={{ backgroundColor: carouselBtnBg, color: carouselBtnColor, border: `1px solid ${carouselBtnBorder}` }}><ChevronRight className="w-4 h-4" /></button>
        </div>

        {/* Service card */}
        <div className="relative overflow-visible" style={revealStyle(isVisible, 4)}>
          <AnimatePresence mode="wait">
            <motion.div key={safeCurrent} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35, ease }}>
              <ServiceCard {...services[safeCurrent]} compact cardTextAlign={cardTextAlign} />
            </motion.div>
          </AnimatePresence>
        </div>

        {c.show_subscribe && <div className="mt-10" style={revealStyle(isVisible, 5)}><SubscribeWidget /></div>}
      </div>
    </div>
  );
};

export default ServiceRow;
