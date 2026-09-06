import type { CSSProperties, ReactNode } from "react";

interface Props {
  children: ReactNode;
  color?: string;
  style?: CSSProperties;
  className?: string;
  /**
   * Opt-in handwritten treatment. The "Architects Daughter" script font is
   * reserved for genuine human-touch annotations — ordinary marketing
   * subtitles render in the normal body font. Defaults to false.
   */
  handwritten?: boolean;
}

/**
 * <RowSubtitle/> — the line that sits between a title and the body copy
 * on most rows.
 *
 * ## Why a separate component
 * Centralising the subtitle keeps sizing/rhythm consistent across rows and
 * gives us ONE place that decides when the script font applies.
 *
 * ## Design choices (the "why")
 *
 * - **`Architects Daughter` (opt-in)**: the script font adds warmth, but it
 *   only reads well as an occasional annotation. It is applied ONLY when
 *   the row/widget sets `subtitle_handwritten: true`.
 *
 * - **`leading-tight` (1.25)**: script fonts have tall ascenders/descenders;
 *   relaxed leading creates ugly gaps. Tight leading keeps lines close.
 *
 * - **Fluid `var(--fs-subtitle)`**: blends viewport
 *   height and width so the subtitle shrinks on short screens too. See
 *   RowBody.tsx for the full clamp/vh+vw explanation.
 *
 * - **`mb-rhythm-base`**: shares the standard 24px rhythm gap.
 */
const RowSubtitle = ({ children, color, style, className, handwritten }: Props) => (
  <p
    className={`leading-tight mb-rhythm-base ${className ?? ""}`}
    style={{
      ...(handwritten ? { fontFamily: "'Architects Daughter', cursive" } : {}),
      fontSize: "var(--fs-subtitle)",
      // Inherit the row's auto-resolved foreground unless the admin
      // set a per-row override. `--row-fg` is published by RowSection.
      color: color ?? "var(--row-fg, inherit)",
      ...style,
    }}
  >
    {children}
  </p>
);

export default RowSubtitle;
