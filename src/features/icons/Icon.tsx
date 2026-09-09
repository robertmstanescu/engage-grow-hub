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

import { Suspense, lazy, type ComponentType, type CSSProperties, type LazyExoticComponent } from "react";
import type { LucideProps } from "lucide-react";


/**
 * Icons load one at a time, on demand. Importing the `icons` map pulled
 * every Lucide icon (660 KB) into the public bundle to render the three
 * or four a page uses. `dynamicIconImports` gives one tiny chunk per icon;
 * the stored name is PascalCase ("ArrowDownUp"), the import key is
 * kebab-case ("arrow-down-up"), so the name is converted and cached.
 */
type IconModule = { default: ComponentType<LucideProps> };
type IconMap = Record<string, () => Promise<IconModule>>;
/* The name → import map itself is 160 KB, so it loads as its own chunk
   the first time an icon is drawn, off the page's critical path. */
let mapPromise: Promise<IconMap> | null = null;
const loadMap = () => (mapPromise ??= import("lucide-react/dynamicIconImports").then((m) => m.default as unknown as IconMap));
const cache = new Map<string, LazyExoticComponent<ComponentType<LucideProps>>>();
export const lucideKey = (name: string): string =>
  name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([A-Za-z])(\d)/g, "$1-$2").toLowerCase();
const EMPTY: ComponentType<LucideProps> = () => null;
const lazyIcon = (name: string) => {
  const key = lucideKey(name);
  let cmp = cache.get(key);
  if (!cmp) {
    cmp = lazy(async () => {
      const map = await loadMap();
      const loader = map[key];
      return loader ? loader() : { default: EMPTY };
    });
    cache.set(key, cmp);
  }
  return cmp;
};

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
    const Cmp = lazyIcon(parsed.name);
    if (!Cmp) return null;
    return (
      <Suspense fallback={<span aria-hidden style={{ display: "inline-block", width: size, height: size, ...style }} className={className} />}>
        <Cmp
          size={size}
          color={color}
          strokeWidth={strokeWidth}
          className={className}
          style={style}
          aria-label={ariaLabel}
          aria-hidden={!ariaLabel || undefined}
        />
      </Suspense>
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
