import { useEffect, useMemo, type RefObject } from "react";
import { useBuilder, type NodePath } from "../builder/BuilderContext";

/* ════════════════════════════════════════════════════════════════════
 * useInspectorFocus — EPIC 1 / US 1.3
 * ════════════════════════════════════════════════════════════════════
 *
 * When the user clicks an ATOMIC node on the canvas (e.g. the eyebrow
 * text inside one specific service card), `BuilderContext.activeNodePath`
 * carries the full path:
 *
 *   ['row','row_x','widget','row_x','field','eyebrow']
 *   ['row','row_x','widget','row_x','item','svc_y','title']
 *
 * The Inspector swaps to the right widget editor on its own (driven by
 * the `widget:<id>` segment, see InspectorPanel). This hook handles the
 * SECOND step: scrolling that editor's matching INPUT into view and
 * briefly highlighting it so the editor knows which control to use.
 *
 * Match strategy (most-specific → least-specific):
 *   1. `[data-inspector-field="item:<id>:<leaf>"]`  — array-item field
 *   2. `[data-inspector-field="<leaf>"]`            — top-level field
 *
 * If nothing matches we silently no-op — the inspector still shows the
 * right editor, the user just doesn't get the auto-scroll.
 *
 * ZERO RUNTIME COST WHEN DISABLED — `useBuilder()` returns the disabled
 * stub on the public site, so `activeNodePath` is always null there and
 * this hook never schedules any DOM work.
 */

/** Pull the focus key out of the path. Returns null if the path stops at
 * the widget level (no atomic tail to focus). */
const deriveFocusKey = (path: NodePath | null): string | null => {
  if (!path || path.length < 5) return null;
  // Path shapes (after the standard ['row', rowId, 'widget', widgetId] head):
  //   [..., 'field', '<leaf>']
  //   [..., '<leaf>']
  //   [..., 'item', '<id>', '<leaf>']
  const tail = path.slice(4);
  if (tail.length === 0) return null;
  if (tail[0] === "field" && tail.length >= 2) return tail[1];
  if (tail[0] === "item" && tail.length >= 3) {
    return `item:${tail[1]}:${tail[2]}`;
  }
  // Fall back to the very last segment (covers ['eyebrow'], ['title'], etc).
  return tail[tail.length - 1];
};

const FLASH_CLASS = "inspector-flash";
const FLASH_MS = 1400;

export const useInspectorFocus = (
  containerRef: RefObject<HTMLElement>,
) => {
  const { activeNodePath } = useBuilder();
  const focusKey = useMemo(() => deriveFocusKey(activeNodePath), [activeNodePath]);

  useEffect(() => {
    if (!focusKey) return;
    const root = containerRef.current;
    if (!root) return;

    // Two ticks: one for React to render the swapped editor, one for
    // layout/paint so scrollIntoView measures the final position.
    let raf1 = 0;
    let raf2 = 0;
    let flashTimer: ReturnType<typeof setTimeout> | undefined;

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        // Most-specific selector first; fall back to a leaf-only match.
        const target =
          root.querySelector<HTMLElement>(`[data-inspector-field="${CSS.escape(focusKey)}"]`) ||
          (focusKey.includes(":")
            ? root.querySelector<HTMLElement>(
                `[data-inspector-field="${CSS.escape(focusKey.split(":").pop() || "")}"]`,
              )
            : null);

        if (!target) return;

        // Scroll the WRAPPER (containing label + input) into view inside
        // the inspector's scroll container — not the page.
        target.scrollIntoView({ behavior: "smooth", block: "center" });

        // Focus the actual editable control inside the wrapper.
        const input = target.querySelector<HTMLElement>(
          'input, textarea, select, [contenteditable="true"]',
        );
        if (input && typeof input.focus === "function") {
          // Slight delay so the smooth-scroll doesn't cancel itself when
          // focus tries to bring the element into view a second time.
          setTimeout(() => input.focus({ preventScroll: true }), 60);
        }

        // Brief green flash to draw the eye.
        target.classList.remove(FLASH_CLASS);
        // Force a reflow so re-adding the class re-triggers the animation
        // even when the same element is selected twice in a row.
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        target.offsetHeight;
        target.classList.add(FLASH_CLASS);
        flashTimer = setTimeout(() => target.classList.remove(FLASH_CLASS), FLASH_MS);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      if (flashTimer) clearTimeout(flashTimer);
    };
  }, [focusKey, containerRef]);
};
