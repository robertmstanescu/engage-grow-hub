import { sendBeaconJson, type EngagementTracker } from "./engagement";

/** Keep the server's capability in this view's memory, never in shared storage. */
export interface TrackedView {
  id: string | null;
  token: string | null;
  tracker: EngagementTracker;
  pending: boolean;
}

export function flushTrackedView(url: string, view: TrackedView | null): void {
  if (!view) return;
  const snap = view.tracker.snapshot();
  if (snap.seconds < 1 && !snap.interacted && snap.scrollDepth === 0) return;
  if (!view.id || !view.token) {
    view.pending = true;
    return;
  }
  view.pending = false;
  sendBeaconJson(url, {
    kind: "engagement", viewId: view.id, engagementToken: view.token,
    seconds: snap.seconds, scrollDepth: snap.scrollDepth, interacted: snap.interacted,
  });
}

export function applyViewReceipt(url: string, view: TrackedView, receipt: unknown): void {
  if (!receipt || typeof receipt !== "object") return;
  const data = receipt as Record<string, unknown>;
  if (data.tracked !== true || typeof data.viewId !== "string" || typeof data.engagementToken !== "string") return;
  if (!data.viewId || !data.engagementToken) return;
  view.id = data.viewId;
  view.token = data.engagementToken;
  if (view.pending) flushTrackedView(url, view);
}