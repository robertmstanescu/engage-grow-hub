import { useRef, useState, useEffect, useCallback } from "react";

/**
 * Lightweight Intersection Observer hook for scroll-triggered reveal.
 * Returns a ref to attach to the element and a boolean `isVisible`.
 * Once visible, stays visible (no re-hiding).
 */
export const useScrollReveal = (options?: IntersectionObserverInit) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, ...options }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
};

/**
 * CSS styles for a reveal item with stagger delay.
 * Apply to each child element within a revealed container.
 */
export const revealStyle = (
  isVisible: boolean,
  staggerIndex = 0,
  baseDelay = 0
): React.CSSProperties => ({
  opacity: isVisible ? 1 : 0,
  transform: isVisible ? "translateY(0)" : "translateY(20px)",
  transition: `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${baseDelay + staggerIndex * 0.1}s, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${baseDelay + staggerIndex * 0.1}s`,
});
