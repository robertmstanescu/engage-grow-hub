import type { CSSProperties, ReactNode } from "react";

interface Props {
  /** When `html` is true, `children` is ignored and `dangerouslySetInnerHTML` is used. */
  children?: ReactNode;
  /** Sanitised HTML string (already passed through `sanitizeHtml`). */
  html?: string;
  color?: string;
  style?: CSSProperties;
  className?: string;
}

/**
 * <RowBody/> — the long-form body copy on every CMS row.
 *
 * ## Why this matters most
 * Body text gets read most. A bad line-height makes every row feel cheap.
 *
 * ## Sizing
 *
 * Size, line-height, tracking and line length all come from the shared
 * tokens in index.css (`--fs-body`, `--lh-body`, `--ls-body`,
 * `--measure-prose`). The tokens are `clamp()`s driven by viewport WIDTH
 * only, so copy never shrinks because a browser window is short, and it
 * is never squeezed by script to make a row fit one screen.
 */
const RowBody = ({ children, html, color, style, className, ...rest }: Props) => {
  // `.measure` caps the line length at ~65 characters so paragraphs break
  // around the middle of a wide page instead of running edge to edge.
  // Rows that genuinely need full-bleed copy can pass `max-w-none`.
  const baseClass = `font-body measure [&_p]:mb-[var(--para-space)] [&_p]:mt-[var(--para-space)] ${className ?? ""}`;
  const baseStyle: CSSProperties = {
    fontSize: "var(--fs-body)",
    // Shared reading-comfort tokens (see index.css) — one place decides
    // line-height, tracking and line length for all prose.
    lineHeight: "var(--lh-body, 1.6)",
    letterSpacing: "var(--ls-body, 0)",
    // Default to the row's auto-resolved foreground (`--row-fg`,
    // published by RowSection). Per-row admin colour pickers still
    // win via the `color` prop. `||` so a cleared or schema-defaulted ""
    // counts as "no override" (see RowTitle).
    color: color || "var(--row-fg, hsl(var(--foreground) / 0.85))",
    ...style,
  };

  if (html !== undefined) {
    return (
      <div
        {...rest}
        data-row-part="body"
        className={baseClass}
        style={baseStyle}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div {...rest} data-row-part="body" className={baseClass} style={baseStyle}>
      {children}
    </div>
  );
};

export default RowBody;
