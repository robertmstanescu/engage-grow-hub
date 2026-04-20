import { useState, memo, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { useTagColors } from "@/hooks/useTagColors";

type CardTextAlign = "left" | "center" | "right";

/**
 * GPU-friendly accordion using CSS grid-template-rows (0fr ↔ 1fr).
 * No height animation, no layout reflow — pure compositor-layer transition.
 */
const Deliverables = memo(({ label, items, textAlign }: { label: string; items: string[]; textAlign?: CardTextAlign }) => {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen(v => !v), []);
  const alignClass = textAlign === "center" ? "text-center" : textAlign === "right" ? "text-right" : "text-left";
  return (
    <div className={`border-t px-5 py-3 ${alignClass}`} style={{ borderColor: "hsl(var(--foreground) / 0.08)", backgroundColor: "hsl(var(--background) / 0.3)" }}>
      <button onClick={toggle} className="flex items-center justify-between w-full text-left">
        <span className="font-body text-[9px] tracking-[0.2em] uppercase" style={{ color: "hsl(var(--pillar-deliverables-label))" }}>{label}</span>
        <ChevronDown
          className="w-3.5 h-3.5 shrink-0"
          style={{
            color: "hsl(var(--foreground) / 0.25)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            willChange: "transform",
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
          willChange: "grid-template-rows, opacity",
        }}
      >
        <div style={{ overflow: "hidden", minHeight: 0 }}>
          <ul className="space-y-1.5 pt-3">
            {items.map((item, i) => (
              <li key={i} className="font-body text-xs leading-snug pl-4 relative" style={{ color: "hsl(var(--foreground) / 0.6)" }}>
                <span className="absolute left-0 text-[10px]" style={{ color: "hsl(var(--accent) / 0.4)" }}>—</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
});

const ease = [0.16, 1, 0.3, 1] as const;

interface ServiceCardProps {
  tag: string; tagType: "fixed" | "retainer" | string; tagBgColor?: string; tagTextColor?: string;
  title: string; subtitle: string; description: string; deliverables: string[];
  deliverablesLabel?: string; price: string; time: string; note?: string; compact?: boolean;
  cardTextAlign?: CardTextAlign;
}

const ServiceCard = memo(({ tag, tagType, tagBgColor, tagTextColor, title, subtitle, description, deliverables, deliverablesLabel = "What's inside", price, time, note, compact, cardTextAlign = "left" }: ServiceCardProps) => {
  const { getTagColors } = useTagColors();
  const adminColors = getTagColors(tagType);
  const bgHex = tagBgColor || adminColors.bgColor;
  const fgHex = tagTextColor || adminColors.textColor;

  const alignClass = cardTextAlign === "center" ? "text-center" : cardTextAlign === "right" ? "text-right" : "text-left";

  return (
    <div
      className={`glass rounded-xl overflow-hidden ${compact ? "flex flex-col" : ""} [&_h4]:[text-shadow:0_1px_2px_hsl(0_0%_0%_/_0.2)] [&_p]:[text-shadow:0_1px_2px_hsl(0_0%_0%_/_0.2)]`}
      style={{
        // Visual extras layered ON TOP of the shared `.glass` utility:
        // shadow + inner highlight specific to the service card. We render
        // the card at full opacity from the very first paint so the
        // saturated tag colour and glass surface appear instantly — no
        // fade-in delay (matches the Vow cards which also paint instantly).
        boxShadow: "0 8px 40px -10px hsl(280 55% 15% / 0.4), 0 0 60px -20px hsl(280 55% 30% / 0.15), inset 0 1px 1px hsl(0 0% 100% / 0.1)",
      }}>
      <div className={`${compact ? "p-4 md:p-5 flex-shrink-0" : "p-5 md:p-6"} ${alignClass}`}>
        <span className={`${cardTextAlign === "center" ? "mx-auto" : cardTextAlign === "right" ? "ml-auto" : ""} inline-block font-body text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 rounded-full mb-3 font-medium`} style={{ backgroundColor: bgHex, color: fgHex }}>{tag}</span>
        <h4 className={`font-display font-bold leading-tight mb-2 ${compact ? "text-sm md:text-base" : "text-base md:text-lg"}`} style={{ color: "hsl(var(--pillar-card-title))" }}>{title}</h4>
        <p className="font-body-heading text-xs font-medium mb-3" style={{ color: "hsl(var(--pillar-subtitle))" }}>{subtitle}</p>
        <p className="font-body text-xs leading-relaxed" style={{ color: "hsl(var(--pillar-card-description))", overflow: "visible", height: "auto", WebkitLineClamp: "unset", display: "block" }}>{description}</p>
      </div>
      <div className={compact ? "flex-1 min-h-0 overflow-visible" : ""}>
        <Deliverables label={deliverablesLabel} items={deliverables} textAlign={cardTextAlign} />
      </div>
      <div className={`${compact ? "px-4 md:px-5" : "px-5 md:px-6"} py-3 flex justify-between items-center flex-wrap gap-2 flex-shrink-0`} style={{ backgroundColor: "hsl(var(--background) / 0.1)" }}>
        <a href="#contact" className="font-display text-[11px] font-bold tracking-wide hover:opacity-80 transition-all duration-500" style={{ color: "hsl(var(--pillar-cta-text))" }}>{price} →</a>
        <span className="font-body text-[11px] tracking-wide" style={{ color: "hsl(var(--pillar-cta-time))" }}>{time}</span>
      </div>
      {note && (
        <div className={`${compact ? "mx-4 md:mx-5 my-2" : "mx-5 md:mx-6 my-3"} px-3 py-2 rounded-lg flex-shrink-0 ${alignClass}`} style={{ backgroundColor: "hsl(var(--background) / 0.4)", borderLeft: "2px solid hsl(var(--accent) / 0.3)" }}>
          <p className="font-body text-[11px] italic leading-relaxed" style={{ color: "hsl(var(--foreground) / 0.5)" }}>{note}</p>
        </div>
      )}
    </div>
  );
});

export default ServiceCard;
