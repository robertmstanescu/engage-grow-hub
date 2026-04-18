import type { CSSProperties, ReactNode } from "react";

interface Props {
  children: ReactNode;
  color?: string;
  style?: CSSProperties;
  className?: string;
}

/**
 * <RowSubtitle/> — the handwritten "Architects Daughter" line that sits
 * between a title and the body copy on most rows.
 *
 * ## Why a separate component
 * The subtitle is the ONLY place on the site where we use a script font.
 * That makes it a strong brand signal — and a strong drift risk if every
 * row hardcodes the font-family inline. Centralising avoids "one row says
 * Architects Daughter, another says Caveat" bugs.
 *
 * ## Design choices (the "why")
 *
 * - **`Architects Daughter`**: the script font adds warmth/humanity to an
 *   otherwise sharp typography system. Used sparingly — a punctuation mark.
 *
 * - **`leading-tight` (1.25)**: script fonts have tall ascenders/descenders;
 *   relaxed leading creates ugly gaps. Tight leading keeps lines close.
 *
 * - **Fluid `clamp(0.9rem, 2vw, 1.2rem)`**: same scaling principle as the
 *   other typography wrappers — never bigger than the body text it sits
 *   above, never smaller than the eyebrow below it.
 *
 * - **`mb-rhythm-base`**: shares the standard 24px rhythm gap.
 */
const RowSubtitle = ({ children, color, style, className }: Props) => (
  <p
    className={`leading-tight mb-rhythm-base ${className ?? ""}`}
    style={{
      fontFamily: "'Architects Daughter', cursive",
      fontSize: "clamp(0.9rem, 2vw, 1.2rem)",
      color: color ?? "inherit",
      ...style,
    }}
  >
    {children}
  </p>
);

export default RowSubtitle;
