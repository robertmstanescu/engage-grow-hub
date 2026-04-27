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
  const duration = Math.min(options?.duration ?? 1100, 1500);
  const idleMs = options?.idleMs ?? 160;
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

    /** Soft ease — cubic-bezier(0.22, 1, 0.36, 1) "easeOutQuint"-ish. */
    const ease = (t: number) => 1 - Math.pow(1 - t, 4);

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
        container.querySelectorAll<HTMLElement>(".snap-section")
      ).filter((el) =>
        el.offsetParent !== null &&
        // Ignore grouping shells such as “last row + footer”; snap to the
        // actual row inside them so the footer can remain free-scroll below.
        !el.querySelector(":scope .snap-section")
      );

    const getScrollTopFor = (el: HTMLElement, containerRect: DOMRect) =>
      container.scrollTop + (el.getBoundingClientRect().top - containerRect.top);

    const settle = () => {
      if (animatingRef.current) return;
      if (window.innerWidth < minWidth) return;

      const sections = getSections();
      if (sections.length < 2) return;

      const containerRect = container.getBoundingClientRect();
      const viewportTop = containerRect.top;
      const viewportH = container.clientHeight;

      // Identify the section currently dominating the viewport top
      let currentIdx = 0;
      for (let i = 0; i < sections.length; i++) {
        const rect = sections[i].getBoundingClientRect();
        if (rect.top - viewportTop <= 1) currentIdx = i;
        else break;
      }

      // Footer rule: never snap when the user is on (or past) the last
      // section — the footer must remain freely scrollable below it.
      if (currentIdx >= sections.length - 1) return;

      const current = sections[currentIdx];
      const next = sections[currentIdx + 1];
      const currentTopRel = current.getBoundingClientRect().top - viewportTop;

      // Already aligned — nothing to do.
      if (Math.abs(currentTopRel) < 2) return;

      const currentHeight = current.getBoundingClientRect().height;
      const currentBottomRel = currentTopRel + currentHeight;
      const edgeTolerance = Math.max(24, viewportH * 0.06);
      const insideTallCurrent =
        currentHeight > viewportH + edgeTolerance &&
        currentTopRel < -edgeTolerance &&
        currentBottomRel > viewportH + edgeTolerance;

      if (insideTallCurrent) {
        return;
      }

      // Direction-aware target: if the user was clearly scrolling down
      // and has moved into the current section by a meaningful amount,
      // glide to the NEXT section. Otherwise settle back to current.
      const scrolledIntoCurrent = -currentTopRel; // px past top of current
      const wantsNext =
        directionRef.current === 1 && scrolledIntoCurrent > directionThresholdPx;
      const wantsPrev =
        directionRef.current === -1 && scrolledIntoCurrent < -directionThresholdPx;

      let target: HTMLElement;
      if (wantsNext) target = next;
      else if (wantsPrev && currentIdx > 0) target = sections[currentIdx - 1];
      else {
        // No clear intent — pick whichever boundary is nearer.
        target = scrolledIntoCurrent > current.offsetHeight / 2 ? next : current;
      }

      tweenScroll(getScrollTopFor(target, containerRect));
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
