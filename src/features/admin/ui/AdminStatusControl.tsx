/**
 * AdminStatusControl — one control that replaces the old multi-field
 * schedule panel.
 *
 *   Visibility:  ( ) Draft   ( ) Live   (•) Scheduled
 *                └─ Goes live: [ 12 Sep 2026, 09:00 ]
 *                   Stops showing on (optional) ▸
 *
 * It is fully controlled and never writes to the database. The parent
 * saves visibility, content and timing atomically, avoiding partial
 * schedules and the old "save draft, then save timing" workflow.
 */
import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { STATE_LABEL, scheduleSentence, type ContentState } from "../naming";

interface Props {
  state: ContentState;
  onStateChange: (state: ContentState) => void;
  publishAt: string | null;
  expiryAt: string | null;
  onPublishAtChange: (value: string | null) => void;
  onExpiryAtChange: (value: string | null) => void;
  disabled?: boolean;
}

export const utcToLocalInput = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const localInputToUtc = (val: string): string | null => {
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const OPTIONS: ContentState[] = ["draft", "live", "scheduled"];

const AdminStatusControl = ({
  state,
  onStateChange,
  publishAt,
  expiryAt,
  onPublishAtChange,
  onExpiryAtChange,
  disabled = false,
}: Props) => {
  const [showExpiry, setShowExpiry] = useState(Boolean(expiryAt));

  const pick = (next: ContentState) => {
    onStateChange(next);
    if (next !== "scheduled") {
      onPublishAtChange(null);
      onExpiryAtChange(null);
      setShowExpiry(false);
    }
  };

  return (
    <div className="space-y-3">
      <div
        className="inline-flex rounded-full border border-border bg-muted/40 p-0.5"
        role="radiogroup"
        aria-label="Visibility"
      >
        {OPTIONS.map((opt) => {
          const active = state === opt;
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => pick(opt)}
              disabled={disabled}
              className={`rounded-full px-3.5 py-1.5 font-body text-xs transition-colors ${
                active
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {STATE_LABEL[opt]}
            </button>
          );
        })}
      </div>

      {state === "scheduled" && (
        <div className="space-y-2 rounded-lg border border-border bg-background p-3">
          <>
              <label className="block font-body text-[11px] uppercase tracking-wider text-muted-foreground">
                Goes live on
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="datetime-local"
                  value={utcToLocalInput(publishAt)}
                  onChange={(e) => onPublishAtChange(localInputToUtc(e.target.value))}
                  disabled={disabled}
                  className="rounded-lg border border-border bg-background px-3 py-2 font-body text-sm text-foreground"
                />
                <CalendarClock size={14} className="text-muted-foreground" aria-hidden="true" />
              </div>

              {publishAt && (
                <p className="font-body text-xs text-foreground">{scheduleSentence(publishAt)}</p>
              )}

              <button
                type="button"
                onClick={() => setShowExpiry((v) => !v)}
                className="font-body text-[11px] text-muted-foreground underline-offset-2 hover:underline"
              >
                {showExpiry ? "Hide" : "Add"} a date to stop showing it
              </button>
              {showExpiry && (
                <input
                  type="datetime-local"
                  value={utcToLocalInput(expiryAt)}
                  onChange={(e) => onExpiryAtChange(localInputToUtc(e.target.value))}
                  disabled={disabled}
                  className="block rounded-lg border border-border bg-background px-3 py-2 font-body text-sm text-foreground"
                />
              )}

              <p className="font-body text-[11px] text-muted-foreground">
                Times use your timezone. Timing is saved together with your content; the site checks every 5 minutes.
              </p>
            </>
        </div>
      )}
    </div>
  );
};

export default AdminStatusControl;
