import { describe, expect, it, vi } from "vitest";
import { applyViewReceipt, flushTrackedView, type TrackedView } from "../trackedEngagement";
import { sendBeaconJson } from "../engagement";

vi.mock("../engagement", () => ({ sendBeaconJson: vi.fn() }));
const url = "https://telemetry.example/track";
const makeView = (): TrackedView => ({
  id: null, token: null, pending: false,
  tracker: {
    snapshot: () => ({ seconds: 5, scrollDepth: 50, interacted: true }),
    stop: () => ({ seconds: 5, scrollDepth: 50, interacted: true }),
  },
});

describe("engagement receipt flow", () => {
  it("does not send engagement before the server grants a capability", () => {
    vi.mocked(sendBeaconJson).mockClear();
    const view = makeView();
    flushTrackedView(url, view);
    expect(sendBeaconJson).not.toHaveBeenCalled();
    expect(view.pending).toBe(true);
  });
  it("sends queued engagement with the server's view and token", () => {
    vi.mocked(sendBeaconJson).mockClear();
    const view = makeView();
    flushTrackedView(url, view);
    applyViewReceipt(url, view, { tracked: true, viewId: "server-view", engagementToken: "server-token" });
    expect(sendBeaconJson).toHaveBeenCalledWith(url, {
      kind: "engagement", viewId: "server-view", engagementToken: "server-token",
      seconds: 5, scrollDepth: 50, interacted: true,
    });
  });
  it("keeps route-change receipts bound to their own view", () => {
    const previous = makeView();
    const current = makeView();
    applyViewReceipt(url, previous, { tracked: true, viewId: "previous-view", engagementToken: "previous-token" });
    expect(current.id).toBeNull();
    expect(current.token).toBeNull();
  });
});