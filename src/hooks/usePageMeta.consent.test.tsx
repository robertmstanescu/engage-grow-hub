/**
 * US07: GA4, Meta Pixel and LinkedIn load only after "Accept"; "Reject"
 * loads nothing and is remembered.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/services/publicSiteContent", () => ({
  fetchPublicSiteContentValue: vi.fn(async () => ({
    tracking: { ga4: "G-TEST", meta_pixel: "123", linkedin_partner: "456" },
  })),
}));
vi.mock("@/hooks/useBrandSettings", () => ({
  fetchBrandIdentity: vi.fn(async () => ({ brandName: "The Magic Coffin", canonicalOrigin: "https://example.com" })),
}));

const TRACKERS = ["mc-ga4-loader", "mc-ga4-init", "mc-meta-pixel", "mc-linkedin-init", "mc-linkedin-loader"];
const loaded = () => TRACKERS.filter((id) => document.getElementById(id));

const Page = ({ hook }: { hook: (p: { title: string }) => void }) => {
  hook({ title: "Home" });
  return null;
};

/** A fresh copy of the hook module, so its once-per-session flags start clean. */
const freshHook = async () => {
  vi.resetModules();
  return (await import("./usePageMeta")).default;
};
const freshAnalytics = () => import("@/services/analytics");

describe("tracking waits for consent (US07)", () => {
  beforeEach(() => {
    document.head.innerHTML = "<title>x</title>";
    localStorage.clear();
  });

  it("loads nothing before the visitor answers", async () => {
    const hook = await freshHook();
    render(<MemoryRouter><Page hook={hook} /></MemoryRouter>);
    await waitFor(() => expect(document.title).toBe("Home | The Magic Coffin"));
    expect(loaded()).toEqual([]);
  });

  it("loads nothing after Reject, also on the next visit", async () => {
    const { setConsentStatus } = await freshAnalytics();
    setConsentStatus("rejected");
    const hook = await freshHook();
    render(<MemoryRouter><Page hook={hook} /></MemoryRouter>);
    await waitFor(() => expect(document.title).toBe("Home | The Magic Coffin"));
    expect(loaded()).toEqual([]);
    const { getConsentStatus } = await freshAnalytics();
    expect(getConsentStatus()).toBe("rejected");
  });

  it("loads all three tags the moment the visitor accepts", async () => {
    const hook = await freshHook();
    render(<MemoryRouter><Page hook={hook} /></MemoryRouter>);
    await waitFor(() => expect(document.title).toBe("Home | The Magic Coffin"));
    expect(loaded()).toEqual([]);
    const { setConsentStatus } = await freshAnalytics();
    await act(async () => {
      setConsentStatus("accepted");
      window.dispatchEvent(new CustomEvent("tmc:consent-changed", { detail: { choice: "accepted" } }));
    });
    expect(loaded()).toEqual(TRACKERS);
  });

  it("loads them straight away for a visitor who accepted before", async () => {
    const { setConsentStatus } = await freshAnalytics();
    setConsentStatus("accepted");
    const hook = await freshHook();
    render(<MemoryRouter><Page hook={hook} /></MemoryRouter>);
    await waitFor(() => expect(loaded()).toEqual(TRACKERS));
  });
});
