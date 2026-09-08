import { useCallback, useEffect, useRef, useState } from "react";
import type { PageRow } from "@/types/rows";

/**
 * useRowHistory — undo / redo for the page builder.
 *
 * Wraps the adapter's `onRowsChange`: every change records the rows as
 * they were before it, so Undo restores them. Changes that arrive
 * within `coalesceMs` of each other (typing in an inspector field
 * fires per keystroke) merge into ONE step, keyed on the first "before"
 * of the burst. Cmd/Ctrl+Z undoes, Shift+Cmd+Z or Cmd+Y redoes, except
 * while typing in an input, textarea or contentEditable, where the
 * browser's own undo applies.
 */
export const HISTORY_LIMIT = 100;

export const useRowHistory = (
  rows: PageRow[],
  onRowsChange: (rows: PageRow[]) => void,
  opts: { coalesceMs?: number; keyboard?: boolean } = {},
) => {
  const { coalesceMs = 700, keyboard = true } = opts;
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const setterRef = useRef(onRowsChange);
  setterRef.current = onRowsChange;
  const past = useRef<PageRow[][]>([]);
  const future = useRef<PageRow[][]>([]);
  const lastChangeAt = useRef(0);
  const [, bump] = useState(0);
  const notify = () => bump((n) => n + 1);

  const change = useCallback((next: PageRow[]) => {
    const now = Date.now();
    const before = rowsRef.current;
    if (now - lastChangeAt.current > coalesceMs) {
      past.current.push(before);
      if (past.current.length > HISTORY_LIMIT) past.current.shift();
      future.current = [];
    }
    lastChangeAt.current = now;
    setterRef.current(next);
    notify();
  }, [coalesceMs]);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return false;
    future.current.push(rowsRef.current);
    lastChangeAt.current = 0;
    setterRef.current(prev);
    notify();
    return true;
  }, []);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return false;
    past.current.push(rowsRef.current);
    lastChangeAt.current = 0;
    setterRef.current(next);
    notify();
    return true;
  }, []);

  useEffect(() => {
    if (!keyboard) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) { if (undo()) e.preventDefault(); }
      else if ((k === "z" && e.shiftKey) || k === "y") { if (redo()) e.preventDefault(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [keyboard, undo, redo]);

  return { change, undo, redo, canUndo: past.current.length > 0, canRedo: future.current.length > 0 };
};
