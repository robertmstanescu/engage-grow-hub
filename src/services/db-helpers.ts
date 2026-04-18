/**
 * Database helpers — the universal "Async UX" toolkit.
 *
 * ──────────────────────────────────────────────────────────────────────────
 *  WHY THIS FILE EXISTS
 * ──────────────────────────────────────────────────────────────────────────
 * Every async operation in a real app has the same three failure modes:
 *
 *   1. The network blows up                    → show an error toast
 *   2. The user double-clicks the button       → guard with a loading flag
 *   3. The component unmounts mid-flight       → finally{} resets state
 *
 * Without a shared helper, every component re-implements (and re-bugs) all
 * three. So we centralize them here. Every Supabase call in the admin panel
 * is funneled through {@link runDbAction} so the UX is uniform: the user
 * always sees a loading state, always sees a success or error toast, and
 * the loading state is *always* released — even when an exception is thrown
 * before the response arrives.
 *
 * ──────────────────────────────────────────────────────────────────────────
 *  WHY `finally` BLOCKS MATTER (Junior-Dev note)
 * ──────────────────────────────────────────────────────────────────────────
 * If you write:
 *
 *     setIsSavingChanges(true);
 *     await saveContact();          // ← throws!
 *     setIsSavingChanges(false);    // ← NEVER RUNS
 *
 * the spinner stays forever and the user has to refresh the page. Putting
 * the reset in `finally` guarantees it runs whether the promise resolves
 * or rejects:
 *
 *     try {
 *       setIsSavingChanges(true);
 *       await saveContact();
 *     } finally {
 *       setIsSavingChanges(false); // ← always runs
 *     }
 *
 * ──────────────────────────────────────────────────────────────────────────
 *  WHY OPTIMISTIC UI MATTERS
 * ──────────────────────────────────────────────────────────────────────────
 * "Optimistic UI" = update the screen *immediately*, then ask the server
 * to confirm. If the server says no, we roll back. This makes deletes,
 * toggles, and reorders feel instant even on slow networks. We only apply
 * it to *safe* operations (delete row, toggle published, reorder) where
 * rollback is cheap. We do NOT apply it to content saves where rolling
 * back a half-edited form would be confusing.
 *
 * See {@link runOptimisticAction} below.
 */

import { toast } from "sonner";
import type { PostgrestError } from "@supabase/supabase-js";

/* ─────────────────────────────────────────────────────────────────────────
   ERROR HANDLING
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Convert any thrown value into a user-friendly string.
 *
 * Supabase errors come in three shapes (PostgrestError, AuthError, plain
 * Error) — and sometimes a fetch failure throws a string. We normalize them
 * all so the UI never has to care.
 */
export const handleDatabaseError = (err: unknown, fallback = "Something went wrong"): string => {
  if (!err) return fallback;
  if (typeof err === "string") return err;

  // PostgrestError shape — has `message`, often a `details` and `hint`
  const pgErr = err as Partial<PostgrestError> & { message?: string };
  if (pgErr?.message) {
    // Friendly translations for the most common DB errors
    if (pgErr.message.includes("duplicate key")) return "That value is already taken.";
    if (pgErr.message.includes("violates row-level security")) return "You don't have permission to do that.";
    if (pgErr.message.includes("Failed to fetch")) return "Network error — please check your connection.";
    return pgErr.message;
  }

  return fallback;
};

/* ─────────────────────────────────────────────────────────────────────────
   PESSIMISTIC ASYNC RUNNER  (default for saves & creates)
   ───────────────────────────────────────────────────────────────────────── */

interface RunDbActionOptions<T> {
  /**
   * Function that actually talks to the database.
   *
   * Accepts both a `Promise<T>` and a `PromiseLike<T>` (a "thenable") so
   * we can pass the Supabase query builder directly without manually
   * `await`-ing it first. The Postgrest builder is a thenable, not a real
   * Promise, but `await` happily resolves either.
   */
  action: () => PromiseLike<T>;
  /** Setter for the `isSavingChanges` (or similar) flag. Optional. */
  setLoading?: (loading: boolean) => void;
  /** Toast message on success. Pass `null` to suppress. */
  successMessage?: string | null;
  /** Override the auto-derived error message. */
  errorMessage?: string;
  /** Called on success with the action's resolved value. */
  onSuccess?: (result: T) => void;
  /** Called on error with the normalized error message. */
  onError?: (message: string, raw: unknown) => void;
}

/**
 * The canonical "save / update / delete" wrapper.
 *
 * It enforces the three rules from the file header:
 *   1. setLoading(true) before, setLoading(false) in `finally`
 *   2. Success toast on resolve, error toast on reject
 *   3. Errors normalized through {@link handleDatabaseError}
 *
 * Returns the action's resolved value on success, or `null` on failure —
 * callers can branch on `if (result !== null)` instead of writing try/catch
 * themselves.
 *
 * @example
 *   const result = await runDbAction({
 *     action: () => supabase.from("contacts").delete().eq("id", id),
 *     setLoading: setIsSavingChanges,
 *     successMessage: "Contact deleted",
 *   });
 */
export async function runDbAction<T>(opts: RunDbActionOptions<T>): Promise<T | null> {
  const { action, setLoading, successMessage = "Saved", errorMessage, onSuccess, onError } = opts;

  setLoading?.(true);
  try {
    const result = await action();

    // Supabase results carry an `error` property even when the promise resolves.
    // We have to peek at it manually because the JS client does not throw on
    // postgrest failures by default.
    const maybeErr = (result as any)?.error;
    if (maybeErr) {
      const message = errorMessage ?? handleDatabaseError(maybeErr);
      toast.error(message);
      onError?.(message, maybeErr);
      return null;
    }

    if (successMessage) toast.success(successMessage);
    onSuccess?.(result);
    return result;
  } catch (err) {
    const message = errorMessage ?? handleDatabaseError(err);
    toast.error(message);
    onError?.(message, err);
    return null;
  } finally {
    // ALWAYS runs — even when we returned early or threw above.
    setLoading?.(false);
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   OPTIMISTIC ASYNC RUNNER  (deletes, toggles, reorders)
   ───────────────────────────────────────────────────────────────────────── */

interface OptimisticOptions<T, S> {
  /** Snapshot the current state so we can restore it on failure. */
  snapshot: () => S;
  /** Apply the optimistic update immediately (before the server responds). */
  applyOptimistic: () => void;
  /** Rollback when the server rejects. Receives the snapshot. */
  rollback: (snapshot: S) => void;
  /** The actual server call. Accepts a thenable (Supabase query builder). */
  action: () => PromiseLike<T>;
  /** Toast on success. Pass `null` to suppress. */
  successMessage?: string | null;
  /** Override auto-derived error message. */
  errorMessage?: string;
}

/**
 * Run an action with optimistic UI.
 *
 * The pattern:
 *   1. Snapshot current state (so we can undo)
 *   2. Apply the change to the UI immediately — feels instant
 *   3. Fire the server request in the background
 *   4. If the server says NO, rollback to the snapshot AND show an error
 *
 * Use this only for *safe* operations:
 *   ✅ Toggling a boolean (published / draft)
 *   ✅ Deleting an item from a list
 *   ✅ Reordering a list
 *
 *   ❌ Saving a half-edited form (rollback would lose user input)
 *   ❌ Multi-table writes (partial failure is hard to undo)
 *
 * @example
 *   await runOptimisticAction({
 *     snapshot: () => contacts,
 *     applyOptimistic: () => setContacts(c => c.filter(x => x.id !== id)),
 *     rollback: (prev) => setContacts(prev),
 *     action: () => supabase.from("contacts").delete().eq("id", id),
 *     successMessage: "Contact deleted",
 *   });
 */
export async function runOptimisticAction<T, S>(opts: OptimisticOptions<T, S>): Promise<T | null> {
  const { snapshot, applyOptimistic, rollback, action, successMessage = null, errorMessage } = opts;

  const previousState = snapshot();
  applyOptimistic();

  try {
    const result = await action();
    const maybeErr = (result as any)?.error;
    if (maybeErr) {
      rollback(previousState);
      toast.error(errorMessage ?? handleDatabaseError(maybeErr));
      return null;
    }
    if (successMessage) toast.success(successMessage);
    return result;
  } catch (err) {
    rollback(previousState);
    toast.error(errorMessage ?? handleDatabaseError(err));
    return null;
  }
}
