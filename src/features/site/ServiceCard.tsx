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
        <span className="font-body text-micro tracking-[0.18em] uppercase" style={{ color: "hsl(var(--pillar-deliverables-label))" }}>{label}</span>
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
              <li key={i} className="font-body text-sm leading-relaxed py-2 pl-4 relative" style={{ color: "hsl(var(--foreground) / 0.7)" }}>
                <span className="absolute left-0 top-2 text-micro" style={{ color: "hsl(var(--accent) / 0.6)" }}>—</span>
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

  /* Outcome-led ordering: the RESULT leads the card, the service name is a
   * quiet label under it, and the deliverable list stays secondary behind
   * the accordion. Buyers scan for outcomes, not scope lists. */
  const outcome = subtitle || title;
  const serviceName = subtitle ? title : "";

  return (
    <div className={`surface-card overflow-hidden ${compact ? "flex flex-col" : ""}`}>
      <div className={`${compact ? "p-6 flex-shrink-0" : "p-6 md:p-8"} ${alignClass}`}>
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-block font-body text-micro tracking-[0.18em] uppercase px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: bgHex, color: fgHex }}>{tag}</span>
          {carouselControls && (
            <div className="ml-auto">{carouselControls}</div>
          )}
        </div>
        <h4
          className="font-display font-bold leading-tight mb-2"
          style={{ color: "hsl(var(--pillar-card-title))", fontSize: compact ? "clamp(16px, 1.4vw, 20px)" : "clamp(18px, 1.7vw, 24px)" }}
        >
          {outcome}
        </h4>
        {serviceName && (
          <p className="font-body text-micro uppercase tracking-[0.18em] mb-3" style={{ color: "hsl(var(--pillar-subtitle))" }}>{serviceName}</p>
        )}
        <p className="font-body text-sm leading-relaxed measure" style={{ color: "hsl(var(--pillar-card-description))" }}>{description}</p>
      </div>

      <div className={compact ? "flex-1 min-h-0 overflow-visible" : ""}>
        <Deliverables label={deliverablesLabel} items={deliverables} textAlign={cardTextAlign} />
      </div>


      {/* Structured CTA row */}
      <div className="border-t border-border px-6 py-4 flex items-center justify-between gap-4 flex-wrap flex-shrink-0">
        <a
          href="#contact"
          className="font-display text-micro uppercase tracking-[0.1em] font-bold px-4 py-2 rounded-full inline-block transition-opacity duration-300 hover:opacity-90"
          style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
        >
          {price}
        </a>
        <span className="font-body text-micro tracking-wide" style={{ color: "hsl(var(--pillar-cta-time))" }}>{time}</span>
      </div>

      {note && (
        <div className="border-t border-border px-6 py-4 flex-shrink-0">
          <p className={`font-body text-micro italic leading-relaxed ${alignClass}`} style={{ color: "hsl(var(--foreground) / 0.55)" }}>{note}</p>
        </div>
      )}
    </div>
  );
});

export default ServiceCard;
