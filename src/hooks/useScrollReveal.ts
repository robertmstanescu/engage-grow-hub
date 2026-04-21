import { useRef, useState, useEffect } from "react";

const isMobile = () => typeof window !== "undefined" && window.innerWidth <= 1024;

/**
 * Lightweight Intersection Observer hook for scroll-triggered reveal.
 * Uses a higher threshold on mobile to reduce observer callbacks.
 * Once visible, stays visible (no re-hiding).
 */
// Animations site-wide are disabled per design decision (only the hero
// retains entry animations). This hook now returns `isVisible: true`
// immediately so consumers render in their final state with no
// transition. The ref is preserved for API compatibility with existing
// call sites.
export const useScrollReveal = (_options?: IntersectionObserverInit) => {
  const ref = useRef<HTMLDivElement>(null);
  return { ref, isVisible: true };
};

/**
 * CSS styles for a reveal item with stagger delay.
 * On mobile: shorter duration, no translateY (opacity-only), GPU-accelerated.
 * On desktop: full 0.9s with translateY for graceful waterfall.
 */
// Animations disabled — return an empty style object so elements paint
// in their final state instantly with no opacity/transform transitions.
// Signature kept for API compatibility with existing call sites.
export const revealStyle = (
  _isVisible: boolean,
  _staggerIndex = 0,
  _baseDelay = 0
): React.CSSProperties => ({});
