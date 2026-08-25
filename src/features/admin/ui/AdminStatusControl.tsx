/**
 * AdminStatusControl — one control that replaces the old multi-field
 * schedule panel.
 *
 *   Visibility:  ( ) Draft   ( ) Live   (•) Scheduled
 *                └─ Goes live: [ 12 Sep 2026, 09:00 ]
 *                   Stops showing on (optional) ▸
 *
 * It owns only the presentation. The `publish_at` / `expiry_at`
 * timestamps are persisted through the same table update the old panel
 * used, and the 5-minute publish job keeps working unchanged. Status
 * itself is owned by the parent form (it is saved with the rest of the
 * content), so this control reports it upward instead of writing it.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarClock, Loader2 } from "lucide-react";
import { STATE_LABEL, scheduleSentence, friendlyDateTime, type ContentState } from "../naming";

export type ScheduledEntityType = "site_content" | "cms_pages" | "blog_posts" | "email_campaigns";

interface Props {
  state: ContentState;
  onStateChange: (state: ContentState) => void;
  /** Table + row id. Omitted for unsaved items — scheduling then explains itself. */
  entityType?: ScheduledEntityType;
  entityId?: string | null;
  /** Warn that the draft must be saved so the right content goes live. */
  hasUnsavedChanges?: boolean;
}

const utcToLocalInput = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const localInputToUtc = (val: string): string | null => {
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const OPTIONS: ContentState[] = ["draft", "live", "scheduled"];

const AdminStatusControl = ({
  state,
  onStateChange,
  entityType,
  entityId,
  hasUnsavedChanges,
}: Props) => {
  const [publishAt, setPublishAt] = useState("");
  const [expiryAt, setExpiryAt] = useState("");
  const [savedPublishAt, setSavedPublishAt] = useState<string | null>(null);
  const [showExpiry, setShowExpiry] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!entityType || !entityId) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase
        .from(entityType as any)
        .select("publish_at, expiry_at")
        .eq("id", entityId)
        .maybeSingle() as any);
      if (cancelled || !data) return;
      const row = data as { publish_at: string | null; expiry_at: string | null };
      setSavedPublishAt(row.publish_at);
      setPublishAt(utcToLocalInput(row.publish_at));
      setExpiryAt(utcToLocalInput(row.expiry_at));
      if (row.expiry_at) setShowExpiry(true);
      if (row.publish_at && new Date(row.publish_at).getTime() > Date.now()) onStateChange("scheduled");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const persist = async (nextPublish: string | null, nextExpiry: string | null) => {
    if (!entityType || !entityId) return false;
    setBusy(true);
    const { error } = await supabase
      .from(entityType as any)
      .update({ publish_at: nextPublish, expiry_at: nextExpiry } as any)
      .eq("id", entityId);
    setBusy(false);
    if (error) {
      toast.error("Couldn't save the schedule. Try again in a moment.");
      return false;
    }
    setSavedPublishAt(nextPublish);
    return true;
  };

  const pick = async (next: ContentState) => {
    onStateChange(next);
    if (next !== "scheduled" && savedPublishAt) {
      const ok = await persist(null, null);
      if (ok) {
        setPublishAt("");
        setExpiryAt("");
        toast.success("Schedule removed");
      }
    }
  };

  const saveSchedule = async () => {
    const utc = localInputToUtc(publishAt);
    if (!utc) {
      toast.error("Pick the date and time it should go live.");
      return;
    }
    if (new Date(utc).getTime() <= Date.now()) {
      toast.error("Pick a time in the future.");
      return;
    }
    const exp = expiryAt ? localInputToUtc(expiryAt) : null;
    if (exp && new Date(exp).getTime() <= new Date(utc).getTime()) {
      toast.error("The stop date has to come after the go-live date.");
      return;
    }
    const ok = await persist(utc, exp);
    if (ok) toast.success(scheduleSentence(utc));
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
          {!entityId ? (
            <p className="font-body text-xs text-muted-foreground">
              Save this as a draft once, then you can pick when it goes live.
            </p>
          ) : (
            <>
              <label className="block font-body text-[11px] uppercase tracking-wider text-muted-foreground">
                Goes live on
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="datetime-local"
                  value={publishAt}
                  onChange={(e) => setPublishAt(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 font-body text-sm text-foreground"
                />
                <button
                  type="button"
                  onClick={saveSchedule}
                  disabled={busy}
                  className="admin-btn-primary inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 font-body text-xs disabled:opacity-50"
                >
                  {busy ? <Loader2 size={12} className="animate-spin" /> : <CalendarClock size={12} />}
                  Save timing
                </button>
              </div>

              {savedPublishAt && (
                <p className="font-body text-xs text-foreground">{scheduleSentence(savedPublishAt)}</p>
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
                  value={expiryAt}
                  onChange={(e) => setExpiryAt(e.target.value)}
                  className="block rounded-lg border border-border bg-background px-3 py-2 font-body text-sm text-foreground"
                />
              )}

              {hasUnsavedChanges && (
                <p className="font-body text-[11px] text-amber-600">
                  Save your changes first so the right version goes live.
                </p>
              )}
              <p className="font-body text-[11px] text-muted-foreground">
                Times use your own timezone. The site checks every 5 minutes.
              </p>
            </>
          )}
        </div>
      )}

      {state === "live" && savedPublishAt && (
        <p className="font-body text-[11px] text-muted-foreground">
          Previously scheduled for {friendlyDateTime(savedPublishAt)} — that timing has been cleared.
        </p>
      )}
    </div>
  );
};

export default AdminStatusControl;
