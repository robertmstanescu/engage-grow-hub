/**
 * AdminField — label + control + helper text, so every input in the
 * admin lines up the same way and every field can carry a plain-English
 * explanation of what it does.
 */
import type { ReactNode } from "react";

interface Props {
  label: string;
  /** Plain-English explanation shown under the control. */
  hint?: ReactNode;
  /** Small right-aligned note, e.g. a character counter. */
  note?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}

const AdminField = ({ label, hint, note, htmlFor, children }: Props) => (
  <div className="space-y-1.5">
    <div className="flex items-baseline justify-between gap-3">
      <label
        htmlFor={htmlFor}
        className="font-body text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </label>
      {note && <span className="font-body text-[10px] text-muted-foreground">{note}</span>}
    </div>
    {children}
    {hint && <p className="font-body text-[11px] leading-snug text-muted-foreground">{hint}</p>}
  </div>
);

export default AdminField;

/** Shared input styling so text inputs/textareas/selects match. */
export const adminInputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/40";
