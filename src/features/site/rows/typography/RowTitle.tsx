import type { CSSProperties, ReactNode } from "react";
import Icon from "@/features/icons/Icon";

interface Props {
  children: ReactNode;
  /** Semantic heading level. Use `h2` inside CMS rows; `h1` is reserved for HeroRow. */
  as?: "h1" | "h2" | "h3";
  /** Optional inline color override — admins set this per-row in the editor. */
  color?: string;
  /** Optional inline style merge — used for scroll-reveal opacity/transform. */
  style?: CSSProperties;
  /** Optional extra className. */
  className?: string;
  /** Optional icon shown above the title (lucide:Name | custom:URL). */
  icon?: string;
  /** Icon size in px (default 32). */
  iconSize?: number;
}

/**
 * <RowTitle/> — the main heading inside a CMS row (NOT the Hero page-opener).
 *
 * Now supports an optional `icon` rendered above the title, sized
 * generously (32px) so it reads as a brand mark rather than a glyph.
 * Icon inherits the title colour for visual cohesion.
 */
const RowTitle = ({ children, as = "h2", color, style, className, icon, iconSize = 32 }: Props) => {
  const Tag = as;
  const resolvedColor = color ?? "var(--row-fg, hsl(var(--foreground)))";
  return (
    <>
      {icon && (
        <div className="mb-rhythm-tight" style={{ color: resolvedColor, ...style }}>
          <Icon value={icon} size={iconSize} />
        </div>
      )}
      <Tag
        className={`font-display font-black leading-[0.95] tracking-tight mb-rhythm-base ${className ?? ""}`}
        style={{
          fontSize: "clamp(1.2rem, 1.8vh + 1.3vw, 2.6rem)",
          color: resolvedColor,
          ...style,
        }}
      >
        {children}
      </Tag>
    </>
  );
};

export default RowTitle;

