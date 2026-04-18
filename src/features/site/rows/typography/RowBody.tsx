import type { CSSProperties, ReactNode } from "react";

interface Props {
  /** When `html` is true, `children` is ignored and `dangerouslySetInnerHTML` is used. */
  children?: ReactNode;
  /** Sanitised HTML string (already passed through `sanitizeHtml`). */
  html?: string;
  color?: string;
  style?: CSSProperties;
  className?: string;
  /** Pass-through for admin auto-fit hook. */
  "data-rte-fit"?: string;
}

/**
 * <RowBody/> — the long-form body copy on every CMS row.
 *
 * ## Why this matters most
 * Body text gets read most. A bad line-height makes every row feel cheap.
 *
 * ## Fluidity (the `clamp()` story for juniors)
 *
 * `clamp(MIN, PREFERRED, MAX)` returns the PREFERRED value, but never
 * lets it drop below MIN or rise above MAX. We use it for typography so
 * the same component is readable on a 13" laptop AND a 27" iMac without
 * a single media query.
 *
 * Our preferred value mixes `vh` AND `vw`:
 *   `1.1vh + 0.6vw`
 *
 * Why both?
 *   - `vw` (viewport width) alone shrinks text on narrow desktops but
 *     ignores SHORT viewports (e.g. a laptop with the dock + browser
 *     chrome eating 200px of height). Result: text overflows vertically.
 *   - `vh` (viewport height) alone shrinks text on short screens but
 *     ignores narrow ones.
 *   - Mixing them means BOTH dimensions contribute. On a small laptop
 *     screen (1366×768) the row stays inside one viewport; on a 4K
 *     monitor the text grows but never past the MAX cap.
 *
 * MIN `0.78rem` (≈12.5px) is an aggressive floor — below WCAG-comfort
 * but acceptable for short body blocks on tiny laptop screens where
 * the alternative is overflowing the viewport. Most rows never hit
 * the floor; it's a safety net.
 * MAX `1.05rem` (≈17px) is the editorial sweet spot.
 *
 * The preferred mix `0.85vh + 0.55vw` is intentionally weighted
 * toward `vh` — short viewports are the dominant overflow risk on
 * laptops, so we prioritise vertical scaling over horizontal.
 */
const RowBody = ({ children, html, color, style, className, ...rest }: Props) => {
  const baseClass = `font-body-heading leading-[1.55] [&_p]:mb-[4px] [&_p]:mt-[4px] ${className ?? ""}`;
  const baseStyle: CSSProperties = {
    fontSize: "clamp(0.78rem, 0.85vh + 0.55vw, 1.05rem)",
    color: color ?? "hsl(var(--foreground) / 0.75)",
    ...style,
  };

  if (html !== undefined) {
    return (
      <div
        {...rest}
        className={baseClass}
        style={baseStyle}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div {...rest} className={baseClass} style={baseStyle}>
      {children}
    </div>
  );
};

export default RowBody;
