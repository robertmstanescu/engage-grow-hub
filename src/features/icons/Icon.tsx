/**
 * <Icon /> — universal icon renderer.
 *
 * Accepts the project's IconValue format and renders either a Lucide
 * icon (tree-shaken, currentColor) or a custom uploaded image from the
 * `icons` storage bucket.
 *
 * IconValue format
 * ────────────────
 *   ""                   → renders nothing
 *   "lucide:Sparkles"    → renders the Lucide <Sparkles /> component
 *   "custom:<url>"       → renders <img src=url />
 *
 * The "lucide:" / "custom:" namespacing keeps the value JSON-safe and
 * lets us add more sources later (e.g. "emoji:✨") without a schema
 * change.
 */

import { Suspense, lazy, type CSSProperties } from "react";
import { icons as lucideIcons, type LucideProps } from "lucide-react";

export type IconValue = string;

interface Props {
  value?: IconValue;
  size?: number;
  /** Stroke / fill colour for Lucide; ignored for custom raster icons. */
  color?: string;
  className?: string;
  style?: CSSProperties;
  /** Stroke width for Lucide icons (defaults to 2). */
  strokeWidth?: number;
  ariaLabel?: string;
}

export const parseIcon = (
  value?: IconValue,
): { kind: "lucide"; name: string } | { kind: "custom"; url: string } | null => {
  if (!value) return null;
  if (value.startsWith("lucide:")) return { kind: "lucide", name: value.slice(7) };
  if (value.startsWith("custom:")) return { kind: "custom", url: value.slice(7) };
  return null;
};

const Icon = ({ value, size = 24, color, className, style, strokeWidth = 2, ariaLabel }: Props) => {
  const parsed = parseIcon(value);
  if (!parsed) return null;

  if (parsed.kind === "lucide") {
    const Cmp = (lucideIcons as Record<string, React.ComponentType<LucideProps>>)[parsed.name];
    if (!Cmp) return null;
    return (
      <Cmp
        size={size}
        color={color}
        strokeWidth={strokeWidth}
        className={className}
        style={style}
        aria-label={ariaLabel}
        aria-hidden={!ariaLabel || undefined}
      />
    );
  }

  return (
    <img
      src={parsed.url}
      alt={ariaLabel ?? ""}
      width={size}
      height={size}
      loading="lazy"
      className={className}
      style={{ width: size, height: size, objectFit: "contain", ...style }}
    />
  );
};

export default Icon;
