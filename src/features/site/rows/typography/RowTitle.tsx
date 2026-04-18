import type { CSSProperties, ReactNode } from "react";

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
}

/**
 * <RowTitle/> — the main heading inside a CMS row (NOT the Hero page-opener).
 *
 * ## The "tiered" decision
 *
 * The user chose a TIERED typography strategy:
 *   - HeroRow keeps its oversized fluid `clamp(1.6rem, 5vw, 5.5rem)` title.
 *     It is the page-opener and needs presence.
 *   - Every OTHER row (Boxed, Service, Profile, Grid, ImageText, Text,
 *     Contact) uses this `<RowTitle/>` with one shared scale.
 *
 * Without this tier, every row would either look like a hero (visual noise)
 * or every row would look identical (no hierarchy). Tiered = both readable
 * and scannable.
 *
 * ## Design choices (the "why")
 *
 * - **`font-display` (Unbounded, weight 900)**: matches the brand identity
 *   established in the hero. Black weight makes the title feel like a
 *   statement, not a paragraph header.
 *
 * - **`leading-[0.95]`**: tight leading on display fonts is intentional —
 *   loose leading on a bold display face makes it look weak and floaty.
 *   At 0.95 the lines almost-but-don't-quite touch.
 *
 * - **Fluid `clamp(1.4rem, 2.2vh + 1.6vw, 2.6rem)`**: scales by BOTH the
 *   viewport height and width, so on a short laptop screen the title
 *   shrinks vertically too — keeping the whole row inside one viewport
 *   without overflow. See RowBody.tsx for the full clamp/vh+vw rationale.
 *
 * - **`tracking-tight`**: large display type at default tracking looks
 *   too airy. Tightening pulls letters together for a cohesive shape.
 *
 * - **`mb-rhythm-base` (24px)**: standard gap to the next element. See
 *   tailwind.config.ts → `spacing.rhythm-base`.
 */
const RowTitle = ({ children, as = "h2", color, style, className }: Props) => {
  const Tag = as;
  return (
    <Tag
      className={`font-display font-black leading-[0.95] tracking-tight mb-rhythm-base ${className ?? ""}`}
      style={{
        fontSize: "clamp(1.4rem, 2.2vh + 1.6vw, 2.6rem)",
        color: color ?? "hsl(var(--foreground))",
        ...style,
      }}
    >
      {children}
    </Tag>
  );
};

export default RowTitle;
