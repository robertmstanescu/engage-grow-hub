import { useRef, useState, useEffect } from "react";

const isMobile = () => typeof window !== "undefined" && window.innerWidth <= 1024;

/**
 * Lightweight Intersection Observer hook for scroll-triggered reveal.
 * Uses a higher threshold on mobile to reduce observer callbacks.
 * Once visible, stays visible (no re-hiding).
 */
export const useScrollReveal = (options?: IntersectionObserverInit) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mobile = isMobile();
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: mobile ? 0.05 : 0.1, ...options }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
};

/**
 * CSS styles for a reveal item with stagger delay.
 * On mobile: shorter duration, no translateY (opacity-only), GPU-accelerated.
 * On desktop: full 0.9s with translateY for graceful waterfall.
 */
export const revealStyle = (
  isVisible: boolean,
  staggerIndex = 0,
  baseDelay = 0
): React.CSSProperties => {
  const mobile = isMobile();
  const duration = mobile ? "0.5s" : "0.9s";
  const delay = `${baseDelay + staggerIndex * (mobile ? 0.08 : 0.15)}s`;
  const ease = "cubic-bezier(0.16, 1, 0.3, 1)";

  return {
    // GHOST OPACITY: 0.01 instead of true 0. Browsers (esp. Chromium) skip
    // backdrop-filter compositing for fully transparent layers as a power-
    // saving optimisation, then have to re-prime the GPU buffer when the
    // element becomes visible again — that re-prime is the "saturation
    // pop" we kept seeing on first reveal. Keeping the layer marginally
    // visible (1%) tricks the compositor into treating it as a live
    // surface and pre-computing the blur/saturation BEFORE the fade-in
    // begins, so the very first frame already shows the finished glass.
    opacity: isVisible ? 1 : 0.01,
    transform: isVisible
      ? "translate3d(0,0,0)"
      : mobile
        ? "translate3d(0,0,0)"      // opacity-only on mobile — no layout shift
        : "translate3d(0,20px,0)",   // desktop keeps the slide-up
    transition: `opacity ${duration} ${ease} ${delay}, transform ${duration} ${ease} ${delay}`,
    // Including `backdrop-filter` in will-change tells the GPU to pre-allocate
    // the buffer needed for the saturate/blur composite BEFORE the card fades
    // in. Reset to `auto` once visible to free the buffer.
    willChange: isVisible ? "auto" : "opacity, transform, backdrop-filter",
    backfaceVisibility: "hidden" as const,
  };
};
