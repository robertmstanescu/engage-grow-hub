import { memo, useState, useCallback } from "react";
import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/types/rows";
import { sanitizeHtml } from "@/lib/sanitize";
import EditableText from "@/components/admin/EditableText";
import SubscribeWidget from "@/components/SubscribeWidget";
import type { Alignment } from "./PageRows";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";

interface GridItem {
  type: "card" | "stat" | "list";
  icon?: string;
  title?: string;
  description?: string;
  number?: string;
  suffix?: string;
  label?: string;
  list_items?: string[];
}

const GridCard = memo(({ item, index, isVisible, colors }: {
  item: GridItem; index: number; isVisible: boolean;
  colors: Record<string, string>;
}) => {
  const [hovered, setHovered] = useState(false);
  const onEnter = useCallback(() => setHovered(true), []);
  const onLeave = useCallback(() => setHovered(false), []);

  const borderColor = hovered
    ? (colors.borderHover || "hsl(var(--accent))")
    : (colors.border || "hsl(280 20% 25% / 0.35)");

  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="rounded-xl p-6 text-left transition-colors duration-300"
      style={{
        ...revealStyle(isVisible, index + 3),
        backgroundColor: "hsl(260 25% 12% / 0.5)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: `1.5px solid ${borderColor}`,
        boxShadow: "0 8px 40px -10px hsl(280 55% 15% / 0.4)",
        backfaceVisibility: "hidden",
        transform: "translateZ(0)",
        height: "auto",
        overflow: "visible",
      }}
    >
      {item.type === "card" && (
        <>
          {item.icon && (
            <span className="text-2xl block mb-3">{item.icon}</span>
          )}
          {item.title && (
            <p className="font-display font-bold text-sm mb-2" style={{ color: colors.cardTitle }}>{item.title}</p>
          )}
          {item.description && (
            <div
              className="font-body text-xs leading-relaxed"
              style={{ color: colors.cardDesc, height: "auto", overflow: "visible" }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }}
            />
          )}
        </>
      )}

      {item.type === "stat" && (
        <div className="text-center py-2">
          <p className="font-display font-black leading-none" style={{ color: colors.statNumber, fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
            {item.number}<span className="text-[0.5em] font-medium">{item.suffix}</span>
          </p>
          {item.label && (
            <p className="font-body text-xs tracking-wider uppercase mt-2" style={{ color: colors.statLabel }}>{item.label}</p>
          )}
          <div className="w-12 h-px mx-auto mt-3" style={{ backgroundColor: colors.border || "hsl(280 20% 25% / 0.5)" }} />
        </div>
      )}

      {item.type === "list" && (
        <>
          {item.title && (
            <p className="font-display font-bold text-sm mb-3" style={{ color: colors.cardTitle }}>{item.title}</p>
          )}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {(item.list_items || []).map((li, i) => (
              <p key={i} className="font-body text-xs leading-snug pl-4 relative" style={{ color: colors.cardDesc }}>
                <span className="absolute left-0" style={{ color: colors.border || "hsl(var(--accent) / 0.4)" }}>—</span>
                {li}
              </p>
            ))}
          </div>
        </>
      )}
    </div>
  );
});

const GridRow = memo(({ row, rowIndex, align = "center" }: { row: PageRow; rowIndex?: number; align?: Alignment }) => {
  const c = row.content;
  const prefix = rowIndex !== undefined ? `rows.${rowIndex}.content` : "";
  const l = { ...DEFAULT_ROW_LAYOUT, ...row.layout };
  const maxW = l.fullWidth ? "max-w-none" : "max-w-[1100px]";
  const { ref, isVisible } = useScrollReveal();
  const items: GridItem[] = c.items || [];

  const eyebrowColor = c.color_eyebrow || "hsl(var(--primary))";
  const titleColor = c.color_title || "hsl(var(--foreground))";
  const descColor = c.color_description || "hsl(var(--foreground) / 0.7)";

  const colors = {
    border: c.color_card_border || "hsl(280 20% 25% / 0.35)",
    borderHover: c.color_card_border_hover || "hsl(var(--accent))",
    cardTitle: c.color_card_title || "#FFFFFF",
    cardDesc: c.color_card_description || "hsl(var(--foreground) / 0.6)",
    statNumber: c.color_stat_number || "hsl(var(--accent))",
    statLabel: c.color_stat_label || "hsl(var(--foreground) / 0.5)",
  };

  const gradStart = l.gradientStart || "hsl(280 55% 20% / 0.5)";
  const gradEnd = l.gradientEnd || "hsl(286 42% 25% / 0.3)";

  const alignClass = align === "right" ? "text-right" : align === "left" ? "text-left" : "text-center";
  const contentAlign = align === "right" ? "ml-auto mr-0" : align === "left" ? "mr-auto ml-0" : "mx-auto";

  const getGridCols = (count: number) => {
    if (count <= 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-1 md:grid-cols-2";
    if (count === 3) return "grid-cols-1 md:grid-cols-3";
    if (count === 4) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
    return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  };

  return (
    <section
      ref={ref}
      data-row-id={row.id}
      data-row-type={row.type}
      data-row-title={row.strip_title}
      className="snap-section grain relative min-h-screen flex items-center justify-center"
      style={{
        backgroundColor: row.bg_color || "hsl(260 20% 6%)",
        isolation: "isolate",
        padding: "24px 0",
        scrollMarginTop: "0px",
        ...(l.bgImage ? { backgroundImage: `url(${l.bgImage})`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
      }}
    >
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 20% 80%, ${gradStart}, transparent), radial-gradient(ellipse 60% 50% at 80% 20%, ${gradEnd}, transparent)`,
          transform: "translateZ(0)",
          willChange: "transform",
        }}
      />

      <div className={`relative z-10 ${maxW} w-full px-6 ${contentAlign} ${alignClass}`}>
        {c.eyebrow && (
          <span
            className="font-body tracking-[0.35em] uppercase block mb-3"
            style={{ ...revealStyle(isVisible, 0), fontSize: "clamp(7px, 0.9vw, 10px)", color: eyebrowColor }}
          >
            <EditableText sectionKey="page_rows" fieldPath={`${prefix}.eyebrow`} as="span">
              {c.eyebrow}
            </EditableText>
          </span>
        )}

        {c.title && (
          <h3
            className="font-display font-bold leading-tight mb-3"
            style={{ ...revealStyle(isVisible, 1), fontSize: "clamp(1.4rem, 3.5vw, 2.6rem)", color: titleColor }}
          >
            <EditableText sectionKey="page_rows" fieldPath={`${prefix}.title`} as="span">
              {c.title}
            </EditableText>
          </h3>
        )}

        {c.description && (
          <EditableText
            sectionKey="page_rows"
            fieldPath={`${prefix}.description`}
            html
            as="div"
            className={`font-body leading-relaxed max-w-[600px] ${contentAlign} mb-10`}
            style={{ ...revealStyle(isVisible, 2), fontSize: "clamp(0.8rem, 1.3vw, 1rem)", color: descColor, height: "auto", overflow: "visible" }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.description || "") }}
          />
        )}

        <div className={`grid ${getGridCols(items.length)} gap-5`}>
          {items.map((item, i) => (
            <GridCard key={i} item={item} index={i} isVisible={isVisible} colors={colors} />
          ))}
        </div>

        {c.show_subscribe && (
          <div className="mt-10" style={revealStyle(isVisible, items.length + 3)}>
            <SubscribeWidget align={align} />
          </div>
        )}
      </div>
    </section>
  );
});

export default GridRow;
