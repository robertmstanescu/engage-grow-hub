/**
 * ─────────────────────────────────────────────────────────────────────────
 * useDebouncedCallback
 * ─────────────────────────────────────────────────────────────────────────
 *
 * WHY THIS HOOK EXISTS (junior-dev orientation)
 * ─────────────────────────────────────────────
 * Several admin editors (TitleLineEditor, RichTextEditor, SubtitleEditor)
 * fire `onChange` on EVERY keystroke. Each `onChange` updates a globally
 * shared `pageRows` blob in `AdminDashboard`. Every state mutation at the
 * top of the tree re-renders every descendant editor — for a long page
 * with a dozen rows that's hundreds of components.
 *
 * The visible symptom is keystroke lag: you type "hello" and the first
 * two letters show up immediately, then the rest hitches as React works
 * through the cascade.
 *
 * The fix is twofold and used together:
 *
 *  1. Each input keeps the typed text in LOCAL state / a ref so what the
 *     user sees on screen never waits for React. The cursor position is
 *     never disturbed because the value comes from local state.
 *
 *  2. The propagation up to global state is DEBOUNCED through this hook.
 *     We collapse a burst of keystrokes into a single state update once
 *     the user pauses for `delayMs`. The global cascade still runs, but
 *     only once per pause — not once per keystroke.
 *
 * AUTO-SAVE INTEGRATION
 * ─────────────────────
 * The same hook is reused in `AdminDashboard` to debounce the silent
 * auto-save effect: any change to `sections` / `cmsPageRows` schedules
 * a 500ms timer; the timer resets every time the data changes; once the
 * user stops editing for 500ms, the save fires exactly once. This is
 * why typing fast doesn't generate dozens of database writes.
 *
 * IMPLEMENTATION NOTES
 * ────────────────────
 *  - We keep the latest callback in a ref so the timer always invokes
 *    the freshest version (avoids stale closures over old props/state).
 *  - We expose a `cancel()` method so callers can abort a pending
 *    invocation when their parent component unmounts or when they want
 *    to flush manually before a navigation event.
 *  - The returned function has a STABLE identity for the lifetime of
 *    the component, so passing it as a prop won't bust child memoization.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef } from "react";

export interface DebouncedFn<Args extends unknown[]> {
  (...args: Args): void;
  /** Cancel a pending invocation without firing it. */
  cancel: () => void;
  /** Fire any pending invocation immediately. */
  flush: () => void;
}

export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number
): DebouncedFn<Args> {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastArgsRef = useRef<Args | null>(null);

  // Always invoke the freshest callback — avoids stale closures.
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Clear any pending timer when the component unmounts so we don't
  // call `setState` on a torn-down tree (React will warn loudly).
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    lastArgsRef.current = null;
  }, []);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (lastArgsRef.current) {
      const args = lastArgsRef.current;
      lastArgsRef.current = null;
      callbackRef.current(...args);
    }
  }, []);

  const debounced = useCallback(
    (...args: Args) => {
      lastArgsRef.current = args;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const latest = lastArgsRef.current;
        lastArgsRef.current = null;
        if (latest) callbackRef.current(...latest);
      }, delayMs);
    },
    [delayMs]
  );

  // Tack the helpers onto the function object. Using `as` because we're
  // augmenting a callback's runtime shape with two extra methods.
  const out = debounced as DebouncedFn<Args>;
  out.cancel = cancel;
  out.flush = flush;
  return out;
}
