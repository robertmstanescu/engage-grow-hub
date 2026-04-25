import { useState, type ReactNode, type MouseEvent } from "react";
import { useBuilder, type NodePath } from "./BuilderContext";

/**
 * SelectableWrapper — adds hover + click selection chrome to a piece
 * of the visual canvas.
 *
 * EPIC 1 / US 1.1 — Atomic Canvas:
 * --------------------------------
 *   Selection is now PATH-BASED. Wrappers receive a `path` array
 *   (e.g. `['row','row_x','widget','row_x','item','svc_y','eyebrow']`)
 *   and report it to the BuilderContext. This lets editors target
 *   exactly one atomic node (a subtitle inside a service card) without
 *   selecting the whole row or widget.
 *
 *   Two-step interaction:
 *     • SINGLE click   → select (blue ring, sets activeNodePath)
 *     • DOUBLE click   → enter inline-edit mode (sets editingPath).
 *                        The wrapped node typically inspects
 *                        `editingPath` to switch its EditableText into
 *                        contentEditable.
 *
 * USAGE
 * -----
 *   <SelectableWrapper
 *     path={['row', row.id, 'widget', widget.id, 'item', item.id, 'eyebrow']}
 *     label="Eyebrow"
 *     variant="atom"
 *   >
 *     <span>{eyebrow}</span>
 *   </SelectableWrapper>
 *
 *   For backwards compatibility we still accept a legacy `id` prop
 *   (`row:row_x` / `widget:row_x` / `hero`) and convert it internally.
 *
 * EVENT BUBBLING
 * --------------
 *   Two layers of guard ensure clicks and hovers select the DEEPEST
 *   element under the cursor, never a parent:
 *
 *    1. Click — `e.stopPropagation()` on `onClick`. Without this a click
 *       on an inner element would bubble to its parent and re-select
 *       the parent a frame later, making inner nodes unreachable.
 *
 *    2. Hover — React's `onMouseEnter` / `onMouseLeave` are non-bubbling
 *       but the BROWSER still fires them on every ancestor when the
 *       cursor enters a descendant. So we instead listen on the bubbling
 *       `onMouseOver` / `onMouseOut` events and call `stopPropagation()`
 *       there: the deepest wrapper sees the event first, marks itself
 *       hovered, then the parent never sees it. This eliminates the
 *       "blue dashed border flickers between parent and child" bug.
 *
 *   ZERO-DOM PUBLIC SITE:
 *   When the BuilderContext is disabled (no provider above the tree =
 *   public visitor), we render `<>{children}</>` so the live site DOM
 *   is byte-identical to before.
 */
interface SelectableWrapperProps {
  /** Path of segments locating this node in the page tree (NEW). */
  path?: NodePath;
  /** LEGACY shorthand id (`row:xxx`, `widget:xxx`, `hero`). Mutually exclusive with `path`. */
  id?: string;
  /** Human-friendly label shown in the floating tag. */
  label?: string;
  /**
   * Visual variant — controls chrome density:
   *   • row    — large blocks (subtle outline)
   *   • widget — inner block (slightly tighter chrome)
   *   • atom   — atomic node (text/image), tightest chrome, inline display
   */
  variant?: "row" | "widget" | "atom";
  /** Use an inline span wrapper instead of a div (for inline text nodes). */
  inline?: boolean;
  children: ReactNode;
}

const legacyIdToPathLocal = (id: string): NodePath => {
  if (!id) return [];
  if (!id.includes(":")) return [id];
  const [kind, rowId, ...rest] = id.split(":");
  if (kind === "widget") return ["row", rowId, "widget", rowId, ...rest];
  return [kind, rowId, ...rest];
};

const SelectableWrapper = ({
  path,
  id,
  label,
  variant = "widget",
  inline = false,
  children,
}: SelectableWrapperProps) => {
  const {
    enabled,
    isPathActive,
    isPathEditing,
    setActiveNodePath,
    setEditingPath,
  } = useBuilder();
  const [hovered, setHovered] = useState(false);

  // PUBLIC-SITE FAST PATH — no provider, render children untouched.
  if (!enabled) return <>{children}</>;

  // Resolve the effective path (new prop wins; fall back to legacy id).
  const effectivePath: NodePath = path && path.length > 0
    ? path
    : id
      ? legacyIdToPathLocal(id)
      : [];

  if (effectivePath.length === 0) return <>{children}</>;

  const isActive = isPathActive(effectivePath);
  const isEditing = isPathEditing(effectivePath);

  // EDIT-MODE PASSTHROUGH (EPIC 1 / US 1.1)
  // ───────────────────────────────────────
  // When this node is in inline-edit mode (double-clicked), we MUST
  // stop intercepting clicks so the user can put the caret inside the
  // contentEditable child, select text, etc. We still keep the visual
  // ring so the editor knows what's being edited, plus a small "exit"
  // hint via Escape key handled by the inner EditableText.
  if (isEditing) {
    const Tag: any = inline ? "span" : "div";
    return (
      <Tag
        data-builder-path={effectivePath.join("/")}
        data-builder-variant={variant}
        data-builder-editing="true"
        className={`relative ${inline ? "inline" : ""} ring-2 ring-blue-600 ring-offset-1 transition-[outline,box-shadow] duration-100`}
      >
        {label && (
          <span
            className="absolute z-50 -top-5 left-0 px-1.5 py-0.5 rounded-sm text-[10px] font-medium uppercase tracking-wider pointer-events-none whitespace-nowrap"
            style={{ backgroundColor: "rgb(37 99 235)", color: "white" }}
          >
            {label} · editing
          </span>
        )}
        {children}
      </Tag>
    );
  }

  const handleClick = (e: MouseEvent<HTMLElement>) => {
    // Strict stopPropagation — selecting an inner node MUST NOT bubble
    // up to its parent wrapper. Without this, clicking an eyebrow would
    // immediately re-select the enclosing widget on the next frame.
    e.stopPropagation();
    setActiveNodePath(effectivePath);
  };

  const handleDoubleClick = (e: MouseEvent<HTMLElement>) => {
    // Two-step UX: single click = select, double click = inline edit.
    e.stopPropagation();
    e.preventDefault();
    setEditingPath(effectivePath);
  };

  const handleMouseOver = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (!hovered) setHovered(true);
  };

  const handleMouseOut = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    const next = e.relatedTarget as Node | null;
    if (next && (e.currentTarget as Node).contains(next)) return;
    setHovered(false);
  };

  // Outline color uses Tailwind blue tokens directly (per the AC spec).
  // Atoms use a slightly thinner outline so multiple nested atoms don't
  // produce a "stacked rings" look.
  const ringClass = variant === "atom" ? "ring-1" : "ring-2";
  const outlineClass = isActive
    ? `${ringClass} ring-blue-600 ring-offset-0`
    : hovered
      ? "outline-dashed outline-1 outline-blue-400"
      : "";

  const Tag: any = inline ? "span" : "div";

  return (
    <Tag
      data-builder-path={effectivePath.join("/")}
      data-builder-variant={variant}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={`relative ${inline ? "inline" : ""} ${outlineClass} transition-[outline,box-shadow] duration-100 cursor-pointer`}
      style={{
        outlineOffset: hovered && !isActive ? "-1px" : undefined,
      }}
    >
      {(hovered || isActive) && label && (
        <span
          className="absolute z-50 -top-5 left-0 px-1.5 py-0.5 rounded-sm text-[10px] font-medium uppercase tracking-wider pointer-events-none whitespace-nowrap"
          style={{
            backgroundColor: isActive ? "rgb(37 99 235)" : "rgb(96 165 250)",
            color: "white",
          }}
        >
          {label}
        </span>
      )}
      {children}
    </Tag>
  );
};

export default SelectableWrapper;
