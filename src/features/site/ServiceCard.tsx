import { useState, memo, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { useTagColors } from "@/hooks/useTagColors";

type CardTextAlign = "left" | "center" | "right";

/**
 * GPU-friendly accordion using CSS grid-template-rows (0fr ↔ 1fr).
 * No height animation, no layout reflow — pure compositor-layer transition.
 * Structured "Lativ" framing: a clean divider rule above the toggle and
 * evenly spaced list items, no glass wash or drop shadows.
 */
const Deliverables = memo(({ label, items, textAlign }: { label: string; items: string[]; textAlign?: CardTextAlign }) => {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen(v => !v), []);
  const alignClass = textAlign === "center" ? "text-center" : textAlign === "right" ? "text-right" : "text-left";
  return (
    <div data-deliverables-open={open ? "true" : "false"} className={`border-t border-border px-6 py-4 ${alignClass}`}>
      <button onClick={toggle} aria-expanded={open} className="flex items-center justify-between w-full text-left">
        <span className="font-body text-[9px] tracking-[0.2em] uppercase" style={{ color: "hsl(var(--pillar-deliverables-label))" }}>{label}</span>
        <ChevronDown
          className="w-4 h-4 shrink-0 transition-transform duration-300 ease-out"
          style={{
            color: "hsl(var(--foreground) / 0.4)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      {/* CSS grid accordion — no JS height measurement, GPU-composited */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
          transition: "grid-template-rows 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease",
        }}
      >
        <div style={{ overflow: "hidden", minHeight: 0 }}>
          <ul className="divide-y divide-border pt-3">
            {items.map((item, i) => (
              <li key={i} className="font-body text-xs leading-relaxed py-2 pl-4 relative" style={{ color: "hsl(var(--foreground) / 0.7)" }}>
                <span className="absolute left-0 top-2 text-[10px]" style={{ color: "hsl(var(--accent) / 0.6)" }}>—</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
});

interface ServiceCardProps {
  tag: string; tagType: "fixed" | "retainer" | string; tagBgColor?: string; tagTextColor?: string;
  title: string; subtitle: string; description: string; deliverables: string[];
  deliverablesLabel?: string; price: string; time: string; note?: string; compact?: boolean;
  cardTextAlign?: CardTextAlign;
  /**
   * Optional carousel navigation rendered inside the card header row.
   */
  carouselControls?: React.ReactNode;
}

const ServiceCard = memo(({ tag, tagType, tagBgColor, tagTextColor, title, subtitle, description, deliverables, deliverablesLabel = "What's inside", price, time, note, compact, cardTextAlign = "left", carouselControls }: ServiceCardProps) => {
  const { getTagColors } = useTagColors();
  const adminColors = getTagColors(tagType);
  const bgHex = tagBgColor || adminColors.bgColor;
  const fgHex = tagTextColor || adminColors.textColor;

  const alignClass = cardTextAlign === "center" ? "text-center" : cardTextAlign === "right" ? "text-right" : "text-left";

  return (
    <div className={`surface-card overflow-hidden ${compact ? "flex flex-col" : ""}`}>
      <div className={`${compact ? "p-6 flex-shrink-0" : "p-6 md:p-8"} ${alignClass}`}>
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-block font-body text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: bgHex, color: fgHex }}>{tag}</span>
          {carouselControls && (
            <div className="ml-auto">{carouselControls}</div>
          )}
        </div>
        <h4 className={`font-display font-bold leading-tight mb-2 ${compact ? "text-sm md:text-base" : "text-base md:text-lg"}`} style={{ color: "hsl(var(--pillar-card-title))" }}>{title}</h4>
        <p className="font-body-heading text-xs font-medium mb-3" style={{ color: "hsl(var(--pillar-subtitle))" }}>{subtitle}</p>
        <p className="font-body text-xs leading-relaxed" style={{ color: "hsl(var(--pillar-card-description))", overflow: "visible", height: "auto", WebkitLineClamp: "unset", display: "block" }}>{description}</p>
      </div>

      <div className={compact ? "flex-1 min-h-0 overflow-visible" : ""}>
        <Deliverables label={deliverablesLabel} items={deliverables} textAlign={cardTextAlign} />
      </div>

      {/* Structured CTA row */}
      <div className="border-t border-border px-6 py-4 flex items-center justify-between gap-4 flex-wrap flex-shrink-0">
        <a
          href="#contact"
          className="font-display text-[10px] uppercase tracking-[0.1em] font-bold px-4 py-2 rounded-full inline-block transition-opacity duration-300 hover:opacity-90"
          style={{ backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--primary-foreground))" }}
        >
          {price}
        </a>
        <span className="font-body text-[11px] tracking-wide" style={{ color: "hsl(var(--pillar-cta-time))" }}>{time}</span>
      </div>

      {note && (
        <div className="border-t border-border px-6 py-4 flex-shrink-0">
          <p className={`font-body text-[11px] italic leading-relaxed ${alignClass}`} style={{ color: "hsl(var(--foreground) / 0.55)" }}>{note}</p>
        </div>
      )}
    </div>
  );
});

export default ServiceCard;
