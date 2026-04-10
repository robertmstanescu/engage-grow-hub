import { useEffect, useRef, useCallback } from "react";

/**
 * Scales the font-size of a container's children so the total content
 * fits within the viewport height on desktop (>1024px).
 * Returns a ref to attach to the section element.
 */
export const useAutoFitText = (minScale = 0.55) => {
  const sectionRef = useRef<HTMLElement | null>(null);

  const fit = useCallback(() => {
    const el = sectionRef.current;
    if (!el || window.innerWidth <= 1024) {
      // Reset on mobile/tablet
      if (el) el.style.fontSize = "";
      return;
    }

    // Reset to measure natural size
    el.style.fontSize = "";

    const vh = window.innerHeight;
    const scrollH = el.scrollHeight;

    if (scrollH <= vh) return; // fits fine

    // Calculate scale factor
    const scale = Math.max(minScale, vh / scrollH);
    el.style.fontSize = `${scale}em`;
  }, [minScale]);

  useEffect(() => {
    // Run after paint
    const raf = requestAnimationFrame(() => fit());
    window.addEventListener("resize", fit);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, [fit]);

  return sectionRef;
};
