import { useEffect, useRef, useCallback } from "react";

/**
 * Scales ONLY elements marked with [data-rte-fit] inside the section
 * so the total section content fits within the viewport height on desktop (>1024px).
 * Headers, titles, eyebrows etc. remain at their original size.
 */
export const useAutoFitText = (minScale = 0.7) => {
  const sectionRef = useRef<HTMLElement | null>(null);

  const fit = useCallback(() => {
    const el = sectionRef.current;
    if (!el) return;

    const rteElements = el.querySelectorAll<HTMLElement>("[data-rte-fit]");

    if (window.innerWidth <= 1024) {
      // Reset on mobile/tablet
      rteElements.forEach((r) => { r.style.fontSize = ""; });
      return;
    }

    // Reset to measure natural size
    rteElements.forEach((r) => { r.style.fontSize = ""; });

    const vh = window.innerHeight;
    const scrollH = el.scrollHeight;

    if (scrollH <= vh) return; // fits fine

    // Calculate how much we overflow
    const overflow = scrollH - vh;

    // Measure total RTE height
    let rteHeight = 0;
    rteElements.forEach((r) => { rteHeight += r.scrollHeight; });

    if (rteHeight <= 0) return; // no RTE content to shrink

    // We need to reduce rteHeight by `overflow` amount
    // targetRteHeight = rteHeight - overflow
    const targetRteHeight = Math.max(rteHeight * minScale, rteHeight - overflow);
    const scale = targetRteHeight / rteHeight;
    const clampedScale = Math.max(minScale, Math.min(1, scale));

    if (clampedScale < 1) {
      rteElements.forEach((r) => {
        const currentSize = parseFloat(getComputedStyle(r).fontSize);
        r.style.fontSize = `${currentSize * clampedScale}px`;
      });
    }
  }, [minScale]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => fit());
    window.addEventListener("resize", fit);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, [fit]);

  return sectionRef;
};
