import { webcrypto } from "node:crypto";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { issueEngagementToken, verifyEngagementToken } from "../../../supabase/functions/track-visitor/engagementToken";

const secret = "unit-test-only-signing-secret";
const viewId = "e34707b0-cb44-4210-96e8-8339c253b729";
const otherView = "f34707b0-cb44-4210-96e8-8339c253b729";
const now = 1_795_591_800_000;

describe("engagement belongs to the server-issued view", () => {
  beforeEach(() => vi.stubGlobal("crypto", webcrypto));
  afterEach(() => vi.unstubAllGlobals());
  it("accepts the token only for the view it was issued for", async () => {
    const token = await issueEngagementToken(viewId, secret, now);
    expect(await verifyEngagementToken(viewId, token, secret, now + 1)).toBe(true);
    expect(await verifyEngagementToken(otherView, token, secret, now + 1)).toBe(false);
  });
  it("rejects missing and forged tokens", async () => {
    expect(await verifyEngagementToken(viewId, undefined, secret, now)).toBe(false);
    const token = await issueEngagementToken(viewId, "attacker-secret", now);
    expect(await verifyEngagementToken(viewId, token, secret, now)).toBe(false);
  });
  it("expires after one day", async () => {
    const token = await issueEngagementToken(viewId, secret, now);
    expect(await verifyEngagementToken(viewId, token, secret, now + 86_400_000)).toBe(false);
  });
  it("rejects extending the expiry without a valid signature", async () => {
    const token = await issueEngagementToken(viewId, secret, now);
    const forged = token.replace(String(now + 86_400_000), String(now + 86_400_001));
    expect(await verifyEngagementToken(viewId, forged, secret, now + 2)).toBe(false);
  });
});