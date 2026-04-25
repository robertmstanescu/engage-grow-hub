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
 * EVENT BUBBLING — Debug Story 3.1
 * --------------------------------
 * Two layers of guard ensure clicks and hovers select the DEEPEST
 * element under the cursor, never a parent:
 *
 *  1. Click — `e.stopPropagation()` on `onClick`. Without this a click
 *     on a widget would bubble to its parent row and re-select the row
 *     a frame later, making inner elements unreachable.
 *
 *  2. Hover — React's `onMouseEnter` / `onMouseLeave` are non-bubbling
 *     but the BROWSER still fires them on every ancestor when the
 *     cursor enters a descendant. So we instead listen on the bubbling
 *     `onMouseOver` / `onMouseOut` events and call `stopPropagation()`
 *     there: the deepest wrapper sees the event first, marks itself
 *     hovered, then the parent never sees it. This eliminates the
 *     "blue dashed border flickers between parent and child" bug.
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
    // Click guard — see component header for the full bubbling story.
    e.stopPropagation();
    setActiveElement(id);
  };

  const handleMouseOver = (e: MouseEvent<HTMLDivElement>) => {
    // Hover guard — `mouseover` bubbles, so the DEEPEST wrapper handles
    // it first. We `stopPropagation` so ancestor wrappers never flag
    // themselves as hovered. The browser will still fire `mouseout` on
    // the previous deepest element (handled below) before this one
    // takes over.
    e.stopPropagation();
    if (!hovered) setHovered(true);
  };

  const handleMouseOut = (e: MouseEvent<HTMLDivElement>) => {
    // Only clear hover when the cursor actually leaves this wrapper
    // (i.e. relatedTarget is outside us). Without this guard a
    // `mouseout` fired when the cursor moves between two children of
    // the same wrapper would briefly drop the parent's hover state and
    // cause flicker.
    e.stopPropagation();
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) return;
    setHovered(false);
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
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
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

