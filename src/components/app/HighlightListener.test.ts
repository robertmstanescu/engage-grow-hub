import { describe, expect, it } from "vitest";
import { highlightSectionKey } from "./HighlightListener";

const message = (origin: string, sectionKey: unknown, source: Window | null = window.parent) =>
  new MessageEvent("message", { origin, source, data: { type: "HIGHLIGHT_SECTION", sectionKey } });

describe("preview highlight access", () => {
  it("rejects commands from another website", () => {
    expect(highlightSectionKey(message("https://untrusted.example", "hero"))).toBeNull();
  });
  it("accepts the site's own preview window", () => {
    expect(highlightSectionKey(message(window.location.origin, "hero"))).toBe("hero");
  });
  it("rejects a same-origin window unrelated to the preview", () => {
    expect(highlightSectionKey(message(window.location.origin, "hero", {} as Window))).toBeNull();
  });
  it("rejects selector injection and malformed keys", () => {
    for (const key of ['hero"] , body, [data-section="hero', {}, "", "x".repeat(101)]) {
      expect(highlightSectionKey(message(window.location.origin, key))).toBeNull();
    }
  });
});