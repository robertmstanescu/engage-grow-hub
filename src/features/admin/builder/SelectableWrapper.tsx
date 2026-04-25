import { useState, type ReactNode, type MouseEvent } from "react";
import { useBuilder } from "./BuilderContext";

/**
 * SelectableWrapper — adds hover + click selection chrome to a piece
 * of the visual canvas (US 15.2).
 *
 *   • on hover  → thin dashed blue outline
 *   • on click  → solid blue ring; element id becomes activeElement
 *   • when context is disabled (public site) → renders children as-is
 *     with ZERO extra DOM. This is critical: the same RowsRenderer
 *     ships to the live site.
 *
 * `e.stopPropagation()` on click is MANDATORY: when the user clicks a
 * widget that lives inside a row, we want only the WIDGET to become
 * active — not its parent row. Bubbling up would re-select the row a
 * frame later and the user could never select an inner element.
 */
interface SelectableWrapperProps {
  /** Globally-unique id for this selectable element (e.g. `widget:abc`). */
  id: string;
  /** Human-friendly label shown in the floating tag (e.g. "Hero", "Contact"). */
  label?: string;
  /**
   * Visual variant — rows tend to be larger blocks (subtler chrome),
   * widgets are inner blocks (slightly tighter chrome). Pure cosmetic.
   */
  variant?: "row" | "widget";
  children: ReactNode;
}

const SelectableWrapper = ({ id, label, variant = "widget", children }: SelectableWrapperProps) => {
  const { enabled, activeElement, setActiveElement } = useBuilder();
  const [hovered, setHovered] = useState(false);

  // PUBLIC-SITE FAST PATH — no provider, render children untouched.
  // WHY: SelectableWrapper now lives inside RowsRenderer which is ALSO
  // used by the live site. Returning a fragment here means the public
  // DOM is byte-identical to before US 15.2.
  if (!enabled) return <>{children}</>;

  const isActive = activeElement === id;

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    // WHY stopPropagation: a widget click should NOT bubble up and
    // re-select its parent row. Without this, clicking inside a row
    // would always end up selecting the row instead of the widget.
    e.stopPropagation();
    setActiveElement(id);
  };

  // Outline color uses Tailwind blue tokens directly (per the AC spec).
  // We use `outline` for hover (doesn't shift layout) and `ring` for
  // the active state (slightly thicker, more obviously "selected").
  const outlineClass = isActive
    ? "ring-2 ring-blue-600 ring-offset-0"
    : hovered
      ? "outline-dashed outline-1 outline-blue-400"
      : "";

  return (
    <div
      data-builder-id={id}
      data-builder-variant={variant}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      className={`relative ${outlineClass} transition-[outline,box-shadow] duration-100 cursor-pointer`}
      style={{
        // `relative` so the floating label tag positions against this
        // wrapper. `cursor-pointer` signals interactivity in the
        // builder. The wrapper is a plain <div> — no margin/padding —
        // so it does NOT shift the visual layout of the underlying
        // widget. Only outline/ring decoration is added.
        outlineOffset: hovered && !isActive ? "-1px" : undefined,
      }}
    >
      {/* Floating label tag — visible only when hovered or active.
          Positioned absolutely so it never affects the widget's box. */}
      {(hovered || isActive) && label && (
        <span
          className="absolute z-50 -top-5 left-0 px-1.5 py-0.5 rounded-sm text-[10px] font-medium uppercase tracking-wider pointer-events-none"
          style={{
            backgroundColor: isActive ? "rgb(37 99 235)" /* blue-600 */ : "rgb(96 165 250)" /* blue-400 */,
            color: "white",
          }}
        >
          {label}
        </span>
      )}
      {children}
    </div>
  );
};

export default SelectableWrapper;
