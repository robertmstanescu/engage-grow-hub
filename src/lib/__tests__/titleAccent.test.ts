import { describe, expect, it } from "vitest";
import { applyUnderlineWord, resolveAccentColor } from "../titleAccent";

describe("resolveAccentColor", () => {
  it("resolves the named accents", () => {
    expect(resolveAccentColor("brand")).toBe("hsl(var(--hero-title-accent))");
    expect(resolveAccentColor("gold")).toBe("hsl(var(--revolver))");
  });
  it("resolves pillar keys and slugs", () => {
    expect(resolveAccentColor("ic")).toBe("#3D348B");
    expect(resolveAccentColor("pay-transparency")).toBe("#E36414");
  });
  it("returns undefined for empty or unknown names", () => {
    expect(resolveAccentColor(undefined)).toBeUndefined();
    expect(resolveAccentColor("")).toBeUndefined();
    expect(resolveAccentColor("nope")).toBeUndefined();
  });
});

describe("applyUnderlineWord", () => {
  it("wraps the first occurrence in text, not inside tags", () => {
    const out = applyUnderlineWord('<p>We bring the coffin.</p>', "coffin.");
    expect(out).toBe('<p>We bring the <span class="mc-underline">coffin.</span></p>');
  });
  it("underlines only the first occurrence", () => {
    const out = applyUnderlineWord("<p>gold gold</p>", "gold");
    expect(out.match(/mc-underline/g)).toHaveLength(1);
  });
  it("leaves the html unchanged when the word is absent or empty", () => {
    expect(applyUnderlineWord("<p>Hello</p>", "missing")).toBe("<p>Hello</p>");
    expect(applyUnderlineWord("<p>Hello</p>", "")).toBe("<p>Hello</p>");
    expect(applyUnderlineWord("<p>Hello</p>", undefined)).toBe("<p>Hello</p>");
  });
  it("escapes regex characters in the word", () => {
    const out = applyUnderlineWord("<p>Price: €900 (net)</p>", "(net)");
    expect(out).toContain('<span class="mc-underline">(net)</span>');
  });
});
