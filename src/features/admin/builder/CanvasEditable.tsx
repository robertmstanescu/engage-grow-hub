import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { sanitizeHtml } from "@/services/sanitize";
import { useBuilder, type NodePath } from "./BuilderContext";

/**
 * ════════════════════════════════════════════════════════════════════
 * CanvasEditable — direct-on-canvas text editing primitive
 * ════════════════════════════════════════════════════════════════════
 *
 * EPIC 1 / US 1.4 — Direct Canvas Editing (contentEditable)
 * ---------------------------------------------------------
 * When the wrapping <SelectableWrapper> is double-clicked, the
 * BuilderContext sets `editingPath`. Atomic text nodes that wrap their
 * visible content in <CanvasEditable> swap their inert content for an
 * UNCONTROLLED `contentEditable` element while editing. On blur the
 * resulting text/HTML is committed back to the central rows JSON via
 * `commitTextAtPath`.
 *
 * WHY UNCONTROLLED?
 * -----------------
 * `contentEditable` is notoriously fragile w.r.t. React's virtual DOM:
 * if React rewrites the editable subtree mid-typing, the browser
 * collapses the selection to the start of the document and the caret
 * "jumps". The safest fix is to let the BROWSER own the DOM during the
 * edit session: we seed the initial value with `dangerouslySetInnerHTML`
 * once, then never set children again until the edit ends. The parent
 * row's re-renders are absorbed because React sees the same key/props
 * and skips diffing the children of an element that has
 * `suppressContentEditableWarning`.
 *
 * USAGE
 * -----
 *   <SelectableWrapper path={path} label="Eyebrow" variant="atom" inline>
 *     <CanvasEditable path={path} value={c.eyebrow} as="span" />
 *   </SelectableWrapper>
 *
 *   For HTML body fields, pass `html`:
 *     <CanvasEditable path={path} value={c.body} html as="div" />
 *
 * Falls back to a plain rendered element when not editing AND, on the
 * public site (no BuilderProvider), to a plain rendered element always.
 * That preserves the byte-identical public DOM that the rest of the
 * builder is careful to maintain.
 */

interface CanvasEditableProps {
  /** NodePath identifying this field in the rows tree. */
  path: NodePath;
  /** Current value (text or HTML, depending on `html`). */
  value: string;
  /** When true, the value is HTML and is committed as innerHTML. */
  html?: boolean;
  /** Element tag to render (default: span). */
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  style?: CSSProperties;
  /**
   * If provided, overrides the default rendered children when NOT
   * editing. Useful when the upstream needs to render decorations
   * (e.g. multi-line title with <br>s) that differ from the raw value.
   */
  children?: ReactNode;
}

const CanvasEditable = ({
  path,
  value,
  html = false,
  as: Tag = "span",
  className,
  style,
  children,
}: CanvasEditableProps) => {
  const { enabled, isPathEditing, commitTextAtPath, setEditingPath } = useBuilder();
  const editing = enabled && isPathEditing(path);

  const ref = useRef<HTMLElement | null>(null);
  // The value at the moment editing began — used so Escape can revert.
  const initialRef = useRef<string>(value);

  // When entering edit mode, snapshot the current value and focus.
  useEffect(() => {
    if (!editing) return;
    initialRef.current = value;
    const el = ref.current;
    if (!el) return;
    // Place caret at the end of the existing content for a natural feel.
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  if (!editing) {
    const El = Tag as any;
    if (children !== undefined) {
      return <El className={className} style={style}>{children}</El>;
    }
    if (html) {
      return (
        <El
          className={className}
          style={style}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
        />
      );
    }
    return <El className={className} style={style}>{value}</El>;
  }

  // Editing: uncontrolled contentEditable.
  const El = Tag as any;
  const handleBlur = () => {
    const el = ref.current;
    if (!el) {
      setEditingPath(null);
      return;
    }
    const next = html ? el.innerHTML : (el.innerText ?? el.textContent ?? "");
    if (next !== initialRef.current) {
      commitTextAtPath(path, html ? sanitizeHtml(next) : next);
    }
    setEditingPath(null);
  };
  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      // Restore original DOM so blur sees no diff.
      const el = ref.current;
      if (el) {
        if (html) el.innerHTML = sanitizeHtml(initialRef.current);
        else el.textContent = initialRef.current;
      }
      setEditingPath(null);
      return;
    }
    if (e.key === "Enter" && !html && !e.shiftKey) {
      e.preventDefault();
      (e.currentTarget as HTMLElement).blur();
    }
  };

  // Initial DOM seeded once and never overwritten by React after that.
  // We rely on `dangerouslySetInnerHTML` for a one-time injection, then
  // immediately hand over to the browser.
  const initialHtml = html ? sanitizeHtml(initialRef.current) : initialRef.current;

  return (
    <El
      ref={(el: HTMLElement | null) => { ref.current = el; }}
      className={className}
      style={{ ...style, outline: "none", cursor: "text", whiteSpace: html ? undefined : "pre-wrap" }}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      dangerouslySetInnerHTML={{ __html: initialHtml }}
    />
  );
};

export default CanvasEditable;
