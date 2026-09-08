import { useEffect, useRef, useState } from "react";

export type AutosaveState = "idle" | "pending" | "saving" | "saved" | "error";

/**
 * useAutosave — quietly save the draft a moment after the last change.
 *
 * `dirty` is the adapter's own "there are edits not in the database"
 * flag; `save` is its quiet draft save (no toasts, no status change).
 * While dirty, we wait `delayMs` since the last time `dirty` flipped or
 * `version` changed, then save once. A manual save resets `dirty`, which
 * cancels the pending autosave.
 */
export const useAutosave = (
  dirty: boolean,
  save: (() => Promise<boolean>) | undefined,
  opts: { delayMs?: number; version?: unknown; paused?: boolean } = {},
) => {
  const { delayMs = 2000, version, paused = false } = opts;
  const [state, setState] = useState<AutosaveState>("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;
  const busy = useRef(false);

  useEffect(() => {
    if (!saveRef.current || paused) return;
    if (!dirty) { if (!busy.current) setState((s) => (s === "saved" ? s : "idle")); return; }
    setState("pending");
    const t = setTimeout(async () => {
      if (busy.current || !saveRef.current) return;
      busy.current = true;
      setState("saving");
      try {
        const ok = await saveRef.current();
        setState(ok ? "saved" : "error");
        if (ok) setSavedAt(Date.now());
      } catch {
        setState("error");
      } finally {
        busy.current = false;
      }
    }, delayMs);
    return () => clearTimeout(t);
  }, [dirty, version, delayMs, paused]);

  return { state, savedAt };
};
