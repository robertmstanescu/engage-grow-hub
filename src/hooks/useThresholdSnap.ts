import { useEffect, useRef } from "react";

/**
 * useThresholdSnap
 *
 * Replaces native CSS scroll-snap with explicit threshold logic:
 * once the user has scrolled past 51% of the current section, the
 * container smoothly animates to the next section. Below 51%, it
 * settles back to the current section.
 *
 * Why JS instead of CSS? `scroll-snap-type` does not expose a
 * threshold knob — the browser picks. This hook gives us the exact
 * 51% rule the design calls for, without disorienting mid-scroll
 * yanks (mandatory) or the unpredictability of `proximity`.
 *
 * Behaviour:
 *  - Only activates on viewports >= 768px (mobile keeps free scroll).
 *  - Debounces user scroll input; snaps after the user pauses.
 *  - Sections are matched via the `[data-snap-section]` attribute on
 *    `.snap-section` elements (added globally below in CSS layer).
 */
export const useThresholdSnap = (
  containerRef: React.RefObject<HTMLElement>,
  options?: { threshold?: number; idleMs?: number; minWidth?: number }
) => {
  const threshold = options?.threshold ?? 0.51;
  const idleMs = options?.idleMs ?? 140;
  const minWidth = options?.minWidth ?? 768;
  const isSnappingRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const getSections = () =>
      Array.from(
        container.querySelectorAll<HTMLElement>(".snap-section")
      ).filter((el) => el.offsetParent !== null);

    const snap = () => {
      if (isSnappingRef.current) return;
      if (window.innerWidth < minWidth) return;

      const sections = getSections();
      if (sections.length === 0) return;

      const containerRect = container.getBoundingClientRect();
      const viewportTop = containerRect.top;
      const viewportHeight = container.clientHeight;

      // Find the section currently dominating the viewport (top <= viewportTop)
      let currentIdx = 0;
      for (let i = 0; i < sections.length; i++) {
        const rect = sections[i].getBoundingClientRect();
        if (rect.top - viewportTop <= 1) {
          currentIdx = i;
        } else {
          break;
        }
      }

      const current = sections[currentIdx];
      const currentRect = current.getBoundingClientRect();
      const currentTopRel = currentRect.top - viewportTop;
      const currentHeight = current.offsetHeight;

      // How far past the top of the current section we've scrolled (px)
      const scrolledIntoCurrent = -currentTopRel;
      const ratio = scrolledIntoCurrent / Math.max(currentHeight, viewportHeight);

      // If we're effectively aligned, do nothing
      if (Math.abs(currentTopRel) < 2) return;

      let target: HTMLElement;
      if (ratio >= threshold && currentIdx < sections.length - 1) {
        target = sections[currentIdx + 1];
      } else {
        target = current;
      }

      const targetTop = target.offsetTop;
      isSnappingRef.current = true;
      container.scrollTo({ top: targetTop, behavior: "smooth" });
      // Release lock once the smooth scroll has had time to settle
      window.setTimeout(() => {
        isSnappingRef.current = false;
      }, 600);
    };

    const onScroll = () => {
      if (isSnappingRef.current) return;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(snap, idleMs);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [containerRef, threshold, idleMs, minWidth]);
};
