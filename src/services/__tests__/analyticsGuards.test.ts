import { afterEach, describe, expect, it, vi } from "vitest";
import { collectSignals, isDeviceExcluded, isPreviewHost, isTrackableHost, setDeviceExcluded } from "../analyticsGuards";
import { startEngagement } from "../engagement";

describe("analytics guards", () => {
  it("only the live site is trackable", () => {
    expect(isTrackableHost("themagiccoffin.com")).toBe(true);
    expect(isTrackableHost("WWW.themagiccoffin.com")).toBe(true);
    expect(isTrackableHost("localhost")).toBe(false);
    expect(isTrackableHost("84fc5959-4725-4ee2-8ad4-b8ce39f00368.lovableproject.com")).toBe(false);
    expect(isTrackableHost("staging.example.com", ["staging.example.com"])).toBe(true);
  });

  it("recognises our own preview hosts", () => {
    for (const h of ["lovable.dev", "id-preview--x.lovable.app", "abc.lovableproject.com", "localhost:4173", "127.0.0.1:8080"]) expect(isPreviewHost(h), h).toBe(true);
    for (const h of ["themagiccoffin.com", "www.linkedin.com", "notlovable.dev.example.com"]) expect(isPreviewHost(h), h).toBe(false);
  });

  it("remembers the exclude-this-device flag", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } });
    Object.defineProperty(window, "localStorage", { value: globalThis.localStorage, configurable: true });
    setDeviceExcluded(true);
    expect(isDeviceExcluded()).toBe(true);
    setDeviceExcluded(false);
    expect(isDeviceExcluded()).toBe(false);
  });

  it("collects signals without throwing", () => {
    const s = collectSignals();
    expect(typeof s.webdriver).toBe("boolean");
    expect(Array.isArray(s.screen)).toBe(true);
  });
});

describe("engagement clock", () => {
  afterEach(() => vi.restoreAllMocks());

  it("counts only visible time and remembers interaction", () => {
    let t = 1_000;
    const now = () => t;
    const tracker = startEngagement(now);
    t += 4_000; // 4 s visible
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    t += 60_000; // a minute hidden: must not count
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    t += 2_000; // 2 s more
    expect(tracker.snapshot().seconds).toBe(6);
    expect(tracker.snapshot().interacted).toBe(false);
    window.dispatchEvent(new Event("pointerdown"));
    const final = tracker.stop();
    expect(final.interacted).toBe(true);
    expect(final.seconds).toBe(6);
  });
});
