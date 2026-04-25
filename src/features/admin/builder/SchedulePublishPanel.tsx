/**
 * SchedulePublishPanel — Inspector control for scheduled publishing.
 *
 * Lets an admin pick a future date+time at which the current draft will
 * be promoted to live by the every-5-minutes `publish-scheduled` cron.
 * Optionally also accepts an "expires at" timestamp that will revert the
 * page back to a draft state.
 *
 * SCOPE NOTE
 * ----------
 * The picker only writes the timestamp columns (`publish_at`,
 * `expiry_at`) on the entity row. It does NOT save the current draft
 * state — that's a separate concern owned by the parent builder. The
 * UX prompts the user to "Save Draft" first.
 *
 * TIMEZONE
 * --------
 * The user's spec calls for "date and time of local machine". The
 * <input type="datetime-local"> element is naive (no offset). We treat
 * the entered value as the user's local time and convert to UTC ISO
 * before persisting, so the cron (which runs in UTC) compares against
 * the same instant the user picked on their wall clock.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, X, Clock } from "lucide-react";

export type ScheduledEntityType = "site_content" | "cms_pages" | "blog_posts" | "email_campaigns";

interface Props {
  /** Which table the entity lives in. */
  entityType: ScheduledEntityType;
  /** Primary key value. For site_content this is the row's `id`. */
  entityId: string;
  /** Display name (used in toasts). */
  entityLabel?: string;
  /** Whether the parent has unsaved draft changes — we warn the user. */
  hasUnsavedChanges?: boolean;
  /** Called after a successful save so the parent can refresh state. */
  onChanged?: () => void;
}

/* ---------- date helpers ---------------------------------------- */

/** Convert a UTC ISO string to the local-naive value `<input type="datetime-local">` expects. */
const utcToLocalInput = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
};

/** Treat datetime-local input as local time and convert to UTC ISO. */
const localInputToUtc = (val: string): string | null => {
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/* ---------------------------------------------------------------- */

const SchedulePublishPanel = ({
  entityType,
  entityId,
  entityLabel,
  hasUnsavedChanges,
  onChanged,
}: Props) => {
  const [publishAt, setPublishAt] = useState("");
  const [expiryAt, setExpiryAt] = useState("");
  const [savedPublishAt, setSavedPublishAt] = useState<string | null>(null);
  const [savedExpiryAt, setSavedExpiryAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── load existing timestamps ──────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from(entityType as any)
        .select("publish_at, expiry_at")
        .eq("id", entityId)
        .maybeSingle();
      if (cancelled) return;
      if (!error && data) {
        const row = data as { publish_at: string | null; expiry_at: string | null };
        setSavedPublishAt(row.publish_at);
        setSavedExpiryAt(row.expiry_at);
        setPublishAt(utcToLocalInput(row.publish_at));
        setExpiryAt(utcToLocalInput(row.expiry_at));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [entityType, entityId]);

  const isScheduled = !!savedPublishAt;
  const isExpiring = !!savedExpiryAt;
  const tzLabel = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // ── save handlers ─────────────────────────────────────────────
  const persist = async (
    nextPublishAt: string | null,
    nextExpiryAt: string | null,
  ) => {
    setSaving(true);
    const { error } = await supabase
      .from(entityType as any)
      .update({ publish_at: nextPublishAt, expiry_at: nextExpiryAt } as any)
      .eq("id", entityId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return false;
    }
    setSavedPublishAt(nextPublishAt);
    setSavedExpiryAt(nextExpiryAt);
    onChanged?.();
    return true;
  };

  const onSchedule = async () => {
    if (!publishAt) {
      toast.error("Pick a date and time first");
      return;
    }
    const utc = localInputToUtc(publishAt);
    if (!utc) {
      toast.error("Invalid date");
      return;
    }
    if (new Date(utc).getTime() <= Date.now()) {
      toast.error("Pick a time in the future");
      return;
    }
    if (hasUnsavedChanges) {
      toast.warning("You have unsaved draft changes. Save the draft first so the scheduler publishes the right content.");
    }
    const expUtc = expiryAt ? localInputToUtc(expiryAt) : null;
    if (expUtc && new Date(expUtc).getTime() <= new Date(utc).getTime()) {
      toast.error("Expiry must be after publish time");
      return;
    }
    const ok = await persist(utc, expUtc);
    if (ok) {
      toast.success(
        `Scheduled${entityLabel ? ` "${entityLabel}"` : ""} to publish at ${new Date(utc).toLocaleString()}`,
      );
    }
  };

  const onCancel = async () => {
    const ok = await persist(null, null);
    if (ok) toast.success("Schedule cleared");
    setPublishAt("");
    setExpiryAt("");
  };

  if (loading) {
    return (
      <div className="text-[11px] text-muted-foreground font-body">Loading schedule…</div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <h4 className="font-body text-[10px] uppercase tracking-[0.18em] font-medium text-muted-foreground">
          Schedule
        </h4>
      </div>

      {isScheduled && (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-[11px] font-body">
          <div className="flex items-center gap-1.5 font-medium">
            <Clock className="h-3 w-3" />
            Goes live: {new Date(savedPublishAt!).toLocaleString()}
          </div>
          {isExpiring && (
            <div className="mt-1 text-muted-foreground">
              Expires: {new Date(savedExpiryAt!).toLocaleString()}
            </div>
          )}
        </div>
      )}

      <div className="space-y-1">
        <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-body">
          Publish at
        </label>
        <input
          type="datetime-local"
          value={publishAt}
          onChange={(e) => setPublishAt(e.target.value)}
          className="w-full px-2 py-1 rounded font-body text-xs border text-black"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-body">
          Expires at <span className="opacity-60">(optional)</span>
        </label>
        <input
          type="datetime-local"
          value={expiryAt}
          onChange={(e) => setExpiryAt(e.target.value)}
          className="w-full px-2 py-1 rounded font-body text-xs border text-black"
        />
      </div>

      <p className="text-[10px] text-muted-foreground font-body">
        Times use your local timezone ({tzLabel}). The system checks every 5 minutes.
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSchedule}
          disabled={saving || !publishAt}
          className="flex-1 px-2 py-1.5 rounded font-body text-[11px] bg-primary text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Saving…" : isScheduled ? "Update schedule" : "Schedule"}
        </button>
        {isScheduled && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-2 py-1.5 rounded font-body text-[11px] border inline-flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default SchedulePublishPanel;
