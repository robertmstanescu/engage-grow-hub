import { describe, it, expect } from "vitest";
import { safeHref } from "./safeHref";

describe("safeHref", () => {
  it.each(["https://example.com/a?b=1", "http://example.com", "mailto:hello@example.com", "tel:+46123", "/blog/", "#contact", "/#contact", "?page=2"])(
    "keeps %s",
    (href) => expect(safeHref(href)).toBe(href),
  );

  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    " javascript:alert(1)",
    "java\tscript:alert(1)",
    "\u0001javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "//evil.example.com",
    "evil.example.com",
  ])("blocks %s", (href) => expect(safeHref(href)).toBe("#"));

  it("falls back on empty and non-string values", () => {
    expect(safeHref("")).toBe("#");
    expect(safeHref(null)).toBe("#");
    expect(safeHref(undefined, "/")).toBe("/");
    expect(safeHref({} as unknown)).toBe("#");
  });
});

describe("safeHref trailing slash (US10)", () => {
  it("ends site paths with a slash before any query or anchor", () => {
    expect(safeHref("/services/pay-transparency")).toBe("/services/pay-transparency/");
    expect(safeHref("/blog?category=General")).toBe("/blog/?category=General");
    expect(safeHref("/services/x#faq")).toBe("/services/x/#faq");
  });

  it("leaves the root, anchors, files and other sites alone", () => {
    expect(safeHref("/")).toBe("/");
    expect(safeHref("/#contact")).toBe("/#contact");
    expect(safeHref("/llms.txt")).toBe("/llms.txt");
    expect(safeHref("https://example.com/a")).toBe("https://example.com/a");
    expect(safeHref("#contact")).toBe("#contact");
  });
});
