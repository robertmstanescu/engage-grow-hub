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
 * Mount once at the root of the admin shell. Owns the singleton dialog
 * state and registers itself with the module-level `openConfirm` hook
 * so any deep descendant can trigger a confirmation without prop drilling.
 */
export const ConfirmDialogHost = () => {
  const [pending, setPending] = useState<PendingState | null>(null);
  const pendingRef = useRef<PendingState | null>(null);
  pendingRef.current = pending;

  // Register / unregister the imperative opener.
  // We do this synchronously on render rather than in useEffect so the
  // first call to confirmDestructive() — which can happen during the
  // same tick the host mounts — still finds the handler.
  if (!openConfirm) {
    openConfirm = (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...opts, resolve });
      });
  }

  const settle = useCallback((ok: boolean) => {
    const p = pendingRef.current;
    if (!p) return;
    p.resolve(ok);
    setPending(null);
  }, []);

  return (
    <AlertDialog
      open={!!pending}
      onOpenChange={(open) => {
        // Treat any close (escape, overlay click, etc.) as Cancel.
        if (!open) settle(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{pending?.title}</AlertDialogTitle>
          <AlertDialogDescription>{pending?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => settle(false)}>
            {pending?.cancelLabel || "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
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
