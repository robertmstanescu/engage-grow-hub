import { useEffect } from "react";

/**
 * useSmoothAnchors
 *
 * Intercepts in-page anchor link clicks (e.g. `<a href="#contact">`)
 * inside a scroll container and replaces the browser's near-instant
 * jump with a slow, fluid rAF-driven tween. The duration and easing
 * mirror {@link useMomentumSnap} so the experience feels coherent —
 * navigation glides instead of teleports.
 *
 * Behaviour:
 *  - Only handles plain left-clicks without modifier keys (so users
 *    can still cmd-click to open in new tabs, etc.).
 *  - Updates `location.hash` after the glide so the URL still
 *    reflects the current section.
 *  - Cancellable: a new wheel/touch gesture from the user will stop
 *    the tween in flight, returning control instantly.
 *
 * Pass the scroll container ref (the element with `overflow-y: auto`)
 * — anchors are resolved by `getElementById` against the document.
 */
export const useSmoothAnchors = (
  containerRef: React.RefObject<HTMLElement>,
  options?: {
    /** Glide duration in ms. Default 1400 — matches snap fluidity. */
    duration?: number;
  }
) => {
  const duration = options?.duration ?? 1400;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    /** Soft cubic ease-in-out — same curve as useMomentumSnap. */
    const ease = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    let raf = 0;
    let cancelled = false;
    let animating = false;

    const cancel = () => {
      cancelled = true;
      animating = false;
      cancelAnimationFrame(raf);
    };

    const tweenTo = (to: number) => {
      cancel();
      cancelled = false;
      const from = container.scrollTop;
      const distance = to - from;
      if (Math.abs(distance) < 1) return;

      animating = true;
      const start = performance.now();
      const step = (now: number) => {
        if (cancelled) return;
        const elapsed = now - start;
        const t = Math.min(1, elapsed / duration);
        container.scrollTop = from + distance * ease(t);
        if (t < 1) {
          raf = requestAnimationFrame(step);
        } else {
          animating = false;
        }
      };
      raf = requestAnimationFrame(step);
    };

    const onClick = (e: MouseEvent) => {
      // Respect modifier-key clicks (open-in-tab, save-link-as, etc.)
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement | null)?.closest?.(
        "a[href]"
      ) as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href") || "";
      // Same-page hash link: "#id" or "/path#id" matching current pathname.
      let hash: string | null = null;
      if (href.startsWith("#")) {
        hash = href.slice(1);
      } else if (href.includes("#")) {
        try {
          const url = new URL(href, window.location.href);
          if (
            url.origin === window.location.origin &&
            url.pathname === window.location.pathname &&
            url.hash
          ) {
            hash = url.hash.slice(1);
          }
        } catch {
          /* ignore malformed URLs */
        }
      }
      if (!hash) return;

      const target = document.getElementById(hash);
      if (!target) return;

      e.preventDefault();

      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const desired =
        container.scrollTop + (targetRect.top - containerRect.top);

      tweenTo(desired);

      // Reflect the new section in the URL without retriggering the
      // browser's native instant jump.
      if (window.location.hash !== `#${hash}`) {
        history.replaceState(null, "", `#${hash}`);
      }
    };

    /** A fresh user gesture mid-glide cancels the tween. */
    const onUserInput = () => {
      if (animating) cancel();
    };

    document.addEventListener("click", onClick);
    container.addEventListener("wheel", onUserInput, { passive: true });
    container.addEventListener("touchstart", onUserInput, { passive: true });

    return () => {
      document.removeEventListener("click", onClick);
      container.removeEventListener("wheel", onUserInput);
      container.removeEventListener("touchstart", onUserInput);
      cancel();
    };
  }, [containerRef, duration]);
};
