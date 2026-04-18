import type { CSSProperties, ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Optional inline color override — admins set this per-row in the editor. */
  color?: string;
  /** Optional inline style merge — used for scroll-reveal opacity/transform. */
  style?: CSSProperties;
  /** Optional extra className — kept rare; default styling already covers 99% of cases. */
  className?: string;
}

/**
 * <RowEyebrow/> — the small uppercase label that sits ABOVE a row's title.
 *
 * ## Why this component exists
 * Before this wrapper, every row component (TextRow, BoxedRow, ServiceRow,
 * ProfileRow, GridRow, ImageTextRow, ContactRow) had its OWN copy of:
 *
 *   <span className="font-body tracking-[0.35em] uppercase block mb-3"
 *         style={{ fontSize: "clamp(7px, 0.9vw, 10px)", color: ... }}>
 *
 * That meant fixing a typo, tweaking the tracking, or changing the font size
 * required edits in 7+ files — and the rows would inevitably drift apart.
 * By centralising the markup here, ONE edit propagates everywhere.
 *
 * ## Design choices (the "why")
 *
 * - **`tracking-[0.35em]`** (super-wide letter spacing): eyebrows are tiny;
 *   the wide tracking makes them feel intentional and luxurious, not like
 *   accidentally-small body text. It also reads better at small sizes.
 *
 * - **`uppercase`**: convention for labels/eyebrows across editorial design.
 *
 * - **`text-[11px]` baseline (with fluid clamp)**: ~11px is the smallest
 *   size at which Inter remains comfortably legible on a retina display
 *   without inducing eye strain.
 *
 * - **`font-body` (Inter)**: the title above uses the display font (Unbounded);
 *   the eyebrow uses the body font for typographic CONTRAST. Same font for
 *   both would look monotonous.
 *
 * - **Per-row color override**: admins must be able to recolor eyebrows for
 *   their specific row (e.g. gold on a dark background, primary on light).
 *   That's why `color` is a prop, not a hardcoded class.
 */
const RowEyebrow = ({ children, color, style, className }: Props) => (
  <span
    className={`font-body tracking-[0.35em] uppercase block mb-rhythm-tight ${className ?? ""}`}
    style={{
      fontSize: "clamp(9px, 0.9vw, 11px)",
      color: color ?? "hsl(var(--muted-foreground))",
      ...style,
    }}
  >
    {children}
  </span>
);

export default RowEyebrow;
