import { useEffect, useRef } from "react";

/**
 * useMomentumSnap
 *
 * Smart scroll-snap that:
 *  - Snaps to the nearest section AFTER the user finishes scrolling.
 *  - Picks the target in the DIRECTION the user was scrolling (so a
 *    downward flick lands on the next row even if barely past the
 *    halfway mark — it follows scroll intent).
 *  - Animates the snap over a custom duration (up to ~1.5s) using a
 *    soft ease so it feels like settling, not snapping.
 *  - Skips snapping on the LAST section so the footer is freely
 *    reachable underneath.
 *  - Disabled below `minWidth` (mobile is free-scroll).
 */
export const useMomentumSnap = (
  containerRef: React.RefObject<HTMLElement>,
  options?: {
    /** How long the snap glide takes, in ms. Default 1100, capped 1500. */
    duration?: number;
    /** ms of scroll silence before we consider the user "settled". */
    idleMs?: number;
    /** Disable below this viewport width. */
    minWidth?: number;
    /** Min scroll delta in current section to consider direction "down". */
    directionThresholdPx?: number;
  }
) => {
  // Slower, more fluid default. Capped higher so the glide can really
  // breathe — the user can always interrupt with a wheel/touch gesture.
  const duration = Math.min(options?.duration ?? 1600, 2200);
  // Slightly longer idle window — gives readers time to pause on a
  // section without being immediately re-snapped after a small adjustment.
  const idleMs = options?.idleMs ?? 280;
  const minWidth = options?.minWidth ?? 768;
  const directionThresholdPx = options?.directionThresholdPx ?? 24;

  const animatingRef = useRef(false);
  const idleTimerRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef(0);
  const directionRef = useRef<1 | -1 | 0>(0);
  const cancelAnimRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    /** Gentle ease-in-out — slow start, slow end, fluid middle. */
    const ease = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    /** rAF-driven scroll tween. Cancellable. */
    const tweenScroll = (to: number) => {
      cancelAnimRef.current?.();
      const from = container.scrollTop;
      const distance = to - from;
      if (Math.abs(distance) < 1) return;

      const start = performance.now();
      let raf = 0;
      let cancelled = false;

      const step = (now: number) => {
        if (cancelled) return;
        const elapsed = now - start;
        const t = Math.min(1, elapsed / duration);
        container.scrollTop = from + distance * ease(t);
        if (t < 1) {
          raf = requestAnimationFrame(step);
        } else {
          animatingRef.current = false;
          cancelAnimRef.current = null;
        }
      };

      animatingRef.current = true;
      raf = requestAnimationFrame(step);
      cancelAnimRef.current = () => {
        cancelled = true;
        cancelAnimRef.current = null;
        animatingRef.current = false;
        cancelAnimationFrame(raf);
      };
    };

    const getSections = () =>
      Array.from(
        container.querySelectorAll<HTMLElement>(
          '.snap-section[data-snap-enabled="true"]'
        )
      ).filter((el) =>
        el.offsetParent !== null &&
        // Ignore grouping shells such as “last row + footer”; snap to the
        // actual row inside them so the footer can remain free-scroll below.
        !el.querySelector(':scope .snap-section[data-snap-enabled="true"]')
      );

    const getScrollTopFor = (el: HTMLElement, containerRect: DOMRect) =>
      container.scrollTop + (el.getBoundingClientRect().top - containerRect.top);

    const settle = () => {
      if (animatingRef.current) return;
      if (window.innerWidth < minWidth) return;

      const sections = getSections();
      if (sections.length === 0) return;

      const containerRect = container.getBoundingClientRect();
      const viewportTop = containerRect.top;
      const viewportH = container.clientHeight;

      // Find the snap-enabled section (if any) that the user is currently
      // straddling — i.e. its top has scrolled above the viewport top but
      // its bottom is still below it. If none qualifies, the user is in
      // free-scroll territory between (or after) snap sections; do nothing.
      let active: HTMLElement | null = null;
      for (const sec of sections) {
        const r = sec.getBoundingClientRect();
        const topRel = r.top - viewportTop;
        const bottomRel = topRel + r.height;
        // Active when the section overlaps the top of the viewport.
        if (topRel <= 1 && bottomRel > 1) {
          active = sec;
          break;
        }
      }
      if (!active) return;

      const activeRect = active.getBoundingClientRect();
      const topRel = activeRect.top - viewportTop;
      const height = activeRect.height;

      // READING-MODE PROTECTION — if an accordion is open inside the
      // active snap section, give the reader a much larger commitment
      // threshold so a small scroll doesn't yank them away.
      const hasOpenAccordion = !!active.querySelector(
        '[data-deliverables-open="true"], [data-state="open"]'
      );
      const commitThreshold = hasOpenAccordion
        ? Math.max(directionThresholdPx * 6, viewportH * 0.35)
        : directionThresholdPx;

      const scrolledIntoActive = -topRel; // px past the top of the section

      // Snap targets for an active section:
      //   • pullTop    → align section top    with viewport top
      //   • pullBottom → align section bottom with viewport bottom
      //                  (used when an accordion is open and the section
      //                  is taller than the viewport — keeps the freshly
      //                  expanded content fully visible at the bottom)
      //   • pushPast   → scroll just past the section so free-scroll
      //                  content below it can take over
      const pullTop = container.scrollTop + topRel;
      const pullBottom = container.scrollTop + topRel + (height - viewportH);
      const pushPast = container.scrollTop + topRel + height;

      // When an accordion is open and the section overflows the viewport,
      // prefer aligning the section's BOTTOM with the viewport bottom.
      const preferBottom = hasOpenAccordion && height > viewportH + 2;
      const upTarget = preferBottom ? pullBottom : pullTop;

      // Already aligned with the chosen target — nothing to do.
      const alreadyAligned = preferBottom
        ? Math.abs(topRel + (height - viewportH)) < 2
        : Math.abs(topRel) < 2;
      if (alreadyAligned) return;

      const wantsDown =
        directionRef.current === 1 && scrolledIntoActive > commitThreshold;
      const wantsUp =
        directionRef.current === -1 && scrolledIntoActive < -commitThreshold;

      let target: number;
      if (wantsDown) target = pushPast;
      else if (wantsUp) target = upTarget;
      else {
        // No clear intent — bias toward "stay" when an accordion is open.
        const midpoint = hasOpenAccordion ? height * 0.75 : height / 2;
        target = scrolledIntoActive > midpoint ? pushPast : upTarget;
      }

      tweenScroll(target);
    };

    const onScroll = () => {
      if (animatingRef.current) return;
      const now = container.scrollTop;
      const delta = now - lastScrollTopRef.current;
      if (delta > 0) directionRef.current = 1;
      else if (delta < 0) directionRef.current = -1;
      lastScrollTopRef.current = now;

      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(settle, idleMs);
    };

    // If the user starts a fresh wheel/touch gesture mid-animation,
    // cancel the in-flight tween so they regain control immediately.
    const onUserInput = () => {
      if (animatingRef.current) cancelAnimRef.current?.();
    };

    lastScrollTopRef.current = container.scrollTop;
    container.addEventListener("scroll", onScroll, { passive: true });
    container.addEventListener("wheel", onUserInput, { passive: true });
    container.addEventListener("touchstart", onUserInput, { passive: true });

    return () => {
      container.removeEventListener("scroll", onScroll);
      container.removeEventListener("wheel", onUserInput);
      container.removeEventListener("touchstart", onUserInput);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      cancelAnimRef.current?.();
    };
  }, [containerRef, duration, idleMs, minWidth, directionThresholdPx]);
};
