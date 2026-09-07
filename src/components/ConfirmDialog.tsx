import { useState, useCallback, useRef } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/* ════════════════════════════════════════════════════════════════════
 * ConfirmDialog — Debug Story 4.1
 * ════════════════════════════════════════════════════════════════════
 *
 * Generic destructive-action guard. Used by the Inspector "Delete Row"
 * button (and any other delete entry-point) to interrupt the action
 * with an AlertDialog modal that the user must explicitly confirm.
 *
 * WHY a hook + portal-style component instead of inline AlertDialog
 * scattered around every delete button:
 *  • Keeps the consumer call-site terse: `confirm(opts).then(ok => ...)`
 *  • Guarantees consistent copy/styling across the editor.
 *  • The dialog is mounted once and reused, so we never get two
 *    competing modals during rapid clicking (Debug Story 1.x ethos).
 *
 * The "Cancel" path resolves with `false` and MUST NOT mutate state —
 * the entire point is that pressing Cancel leaves the DOM exactly as
 * it was before the delete attempt.
 * ════════════════════════════════════════════════════════════════════ */

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When true, paint the confirm button in the destructive palette. */
  destructive?: boolean;
  /**
   * Optional middle action: actually persist the pending work, then
   * continue. Resolve `true` when the save succeeded (the dialog closes
   * and the caller proceeds); resolve `false` to keep the dialog open
   * so the user can fix the problem or cancel.
   */
  onSave?: () => Promise<boolean>;
  saveLabel?: string;
}

interface PendingState extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

let openConfirm: ((opts: ConfirmOptions) => Promise<boolean>) | null = null;

/**
 * Imperative API — call from anywhere (handlers, callbacks, etc.):
 *
 *   if (!(await confirmDestructive({ title: "…", description: "…" }))) return;
 *   doTheDeletion();
 *
 * Returns false if the host `<ConfirmDialogHost />` is not mounted yet,
 * which fails *safe* (the destructive action is skipped, not silently
 * executed).
 */
export const confirmDestructive = (opts: ConfirmOptions): Promise<boolean> => {
  if (!openConfirm) return Promise.resolve(false);
  return openConfirm(opts);
};

/**
 * confirmUnsavedExit — the "leave without saving?" guard shared by the
 * full-screen editors (PageBuilderShell's adapters, SiteEditor) before
 * they navigate back to the dashboard with unsaved changes. Centralized
 * so the copy can't drift between call sites — the exact kind of drift
 * that split blocksToHtml into two out-of-sync copies elsewhere.
 *
 * Pass `onSave` to offer the third "Save all" action, which persists the
 * pending changes and only then lets the navigation continue.
 */
export const confirmUnsavedExit = (
  onSave?: () => Promise<boolean>,
): Promise<boolean> =>
  confirmDestructive({
    title: "Leave without saving?",
    description: "You have unsaved changes. If you leave now, they'll be lost.",
    confirmLabel: "Leave without saving",
    cancelLabel: "Stay on this page",
    saveLabel: "Save all & leave",
    destructive: true,
    onSave,
  });

/**
 * Mount once at the root of the admin shell. Owns the singleton dialog
 * state and registers itself with the module-level `openConfirm` hook
 * so any deep descendant can trigger a confirmation without prop drilling.
 */
export const ConfirmDialogHost = () => {
  const [pending, setPending] = useState<PendingState | null>(null);
  const [saving, setSaving] = useState(false);
  const pendingRef = useRef<PendingState | null>(null);
  pendingRef.current = pending;

  // Register the imperative opener. Assigned on every render (not only
  // when unset) so a REMOUNTED host takes ownership — a stale reference
  // to an unmounted host's setState would silently never open anything.
  openConfirm = (opts: ConfirmOptions) =>
    new Promise<boolean>((resolve) => {
      setSaving(false);
      setPending({ ...opts, resolve });
    });

  const settle = useCallback((ok: boolean) => {
    const p = pendingRef.current;
    if (!p) return;
    p.resolve(ok);
    setSaving(false);
    setPending(null);
  }, []);

  const runSave = useCallback(async () => {
    const p = pendingRef.current;
    if (!p?.onSave) return;
    setSaving(true);
    let ok = false;
    try {
      ok = await p.onSave();
    } catch {
      ok = false;
    }
    // Only close (and let the caller continue) when the save worked.
    if (ok) settle(true);
    else setSaving(false);
  }, [settle]);

  return (
    <AlertDialog
      open={!!pending}
      onOpenChange={(open) => {
        // Treat any close (escape, overlay click, etc.) as Cancel.
        if (!open && !saving) settle(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{pending?.title}</AlertDialogTitle>
          <AlertDialogDescription>{pending?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving} onClick={() => settle(false)}>
            {pending?.cancelLabel || "Cancel"}
          </AlertDialogCancel>
          {pending?.onSave && (
            <button
              type="button"
              disabled={saving}
              onClick={runSave}
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              {saving ? "Saving…" : pending?.saveLabel || "Save all"}
            </button>
          )}
          <AlertDialogAction
            disabled={saving}
            onClick={() => settle(true)}
            className={
              pending?.destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
          >
            {pending?.confirmLabel || "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
