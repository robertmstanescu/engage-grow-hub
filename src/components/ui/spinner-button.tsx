/**
 * SpinnerButton — a button that shows a spinner and disables itself
 * while an async action is running.
 *
 * USAGE
 *   <SpinnerButton
 *     isLoading={isSavingChanges}
 *     loadingLabel="Saving…"
 *     onClick={handleSave}>
 *     Save Draft
 *   </SpinnerButton>
 *
 * WHY THIS COMPONENT EXISTS
 * Without it, every button in the admin had to remember to:
 *   1. Disable itself while loading (preventing double-submit)
 *   2. Show a visual spinner (not just text "Saving…")
 *   3. Maintain its colors during the disabled state
 *
 * Centralizing the pattern means we can never forget step #1, which is
 * the difference between "saved twice" and "saved once" on a slow network.
 */

import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

interface SpinnerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Whether the async action is in progress. Disables the button + shows spinner. */
  isLoading?: boolean;
  /** Optional override for the label shown while loading. */
  loadingLabel?: ReactNode;
  /** Optional icon shown to the LEFT of the label when NOT loading. */
  icon?: ReactNode;
}

export const SpinnerButton = forwardRef<HTMLButtonElement, SpinnerButtonProps>(
  ({ isLoading = false, loadingLabel, icon, children, disabled, className, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        // ALWAYS disable while loading — this is what prevents double-clicks.
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={`inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${className ?? ""}`}
        {...rest}>
        {isLoading ? (
          <>
            <Loader2 size={13} className="animate-spin" aria-hidden="true" />
            <span>{loadingLabel ?? children}</span>
          </>
        ) : (
          <>
            {icon}
            <span>{children}</span>
          </>
        )}
      </button>
    );
  }
);

SpinnerButton.displayName = "SpinnerButton";
