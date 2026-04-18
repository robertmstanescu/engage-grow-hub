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
 * Inconsistent body sizes make one row look "important" and another
 * "unimportant" without any actual hierarchy reason.
 *
 * ## Design choices (the "why")
 *
 * - **`leading-[1.6]`**: the W3C accessibility guideline (WCAG 2.1
 *   Success Criterion 1.4.12) recommends a line height of AT LEAST 1.5
 *   for body text. We use 1.6 because:
 *     - it improves long-form readability (eye doesn't lose its place)
 *     - it leaves enough vertical breathing room for the descenders of
 *       Bricolage Grotesque without looking spaced-out
 *     - it matches editorial publication standards (NYT, Stripe docs)
 *
 * - **`font-body-heading` (Bricolage Grotesque)**: chosen over plain Inter
 *   for body because Bricolage has more personality (subtle wedges and
 *   curves) without sacrificing legibility. Sets us apart from generic
 *   "AI-generated landing page" Inter-everywhere look.
 *
 * - **Fluid `clamp(0.9rem, 1.5vw, 1.05rem)`**: caps at ~17px on desktop —
 *   slightly above default 16px, the sweet spot for adult readability.
 *   Floors at 14.4px on mobile (still WCAG-compliant for body).
 *
 * - **`[&_p]:mb-[5px] [&_p]:mt-[5px]`**: per project convention, every
 *   paragraph inside the body gets 5px above + 5px below for visual
 *   rhythm without huge gaps. Documented in mem://architecture/page-builder.
 */
const RowBody = ({ children, html, color, style, className, ...rest }: Props) => {
  const baseClass = `font-body-heading leading-[1.6] [&_p]:mb-[5px] [&_p]:mt-[5px] ${className ?? ""}`;
  const baseStyle: CSSProperties = {
    fontSize: "clamp(0.9rem, 1.5vw, 1.05rem)",
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
