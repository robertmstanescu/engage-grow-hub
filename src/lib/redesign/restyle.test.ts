/**
 * The restyle may change how a page looks, never what it says.
 * These tests hold that promise on small hand-made rows; the build
 * script (`scripts/redesign/build-restyle.ts`) holds it again on the
 * real content before it writes any SQL.
 */
import { describe, it, expect } from "vitest";
import { cleanRichText, restyleRows, visibleText, kindForSlug } from "./restyle";

/* eslint-disable @typescript-eslint/no-explicit-any */
const row = (type: string, data: Record<string, any>, extra: Record<string, any> = {}) => ({
  id: `row-${type}`,
  strip_title: type,
  bg_color: "#2A0E33",
  layout: { glass: true, surfaceRadius: 32, outlineWidth: 5, alignment: "center" },
  columns: [{ id: "c", cells: [{ id: "k", widgets: [{ id: "w", type, data }] }] }],
  ...extra,
});

const sample = (): any[] => [
  row("hero", {
    title_lines: ['<p><span style="color: #E5C54F; font-size: 64px">Your organisation</span></p>', "<p>has vampires.</p>"],
    body: '<p style="text-align: left"><span style="font-size: 18px">Dead meetings.</span></p>',
    answer: "A fractional people and comms consultancy.",
    image_url: "https://example.com/a.webp",
    color_title: "#ffffff",
  }),
  row("boxed", {
    title_lines: ["<p>Six ways in</p>"],
    cards: [
      { title: "Internal Communications", body: "<p>Plain words.</p>", link_url: "/services/internal-communications" },
      { title: "People Operations", body: "<p>Order.</p>", link_url: "/services/people-operations" },
    ],
  }),
  row("faq", { title_lines: ["<p>Questions</p>"], items: [{ question: "How much?", answer: "<p>From €600.</p>" }] }),
];

describe("restyleRows", () => {
  it.each(["home", "services", "service", "about", "privacy", "other"] as const)(
    "keeps every visible word on a %s page",
    (kind) => {
      const before = sample();
      const after = restyleRows(before, { kind, slug: "services/internal-communications" } as any);
      expect(visibleText(after).split("\n").sort()).toEqual(visibleText(before).split("\n").sort());
    },
  );

  it("does not change the rows it was given", () => {
    const before = sample();
    const frozen = JSON.stringify(before);
    restyleRows(before, { kind: "home" });
    expect(JSON.stringify(before)).toBe(frozen);
  });

  it("gives the same result when it runs twice", () => {
    const once = restyleRows(sample(), { kind: "home" });
    const twice = restyleRows(once, { kind: "home" });
    expect(twice).toEqual(once);
  });

  it("removes the old frame: glass flag, outline, band colour", () => {
    const [hero] = restyleRows(sample(), { kind: "home" });
    expect(hero.bg_color).toBe("");
    expect(hero.layout.glass).toBeUndefined();
    expect(hero.layout.outlineWidth).toBeUndefined();
  });

  it("survives empty, odd and missing input", () => {
    expect(restyleRows([], { kind: "home" })).toEqual([]);
    expect(() => restyleRows([{} as any, { columns: null } as any, null as any].filter(Boolean), { kind: "other" })).not.toThrow();
  });
});

describe("cleanRichText", () => {
  it("drops inline sizes and keeps the words", () => {
    const out = cleanRichText('<p><span style="font-size: 40px">Hello</span> there</p>');
    expect(out).not.toMatch(/font-size/);
    expect(out.replace(/<[^>]+>/g, "")).toBe("Hello there");
  });

  it("turns a gold title span into the accent class", () => {
    const out = cleanRichText('<span style="color: #E5C54F">Lift the lid</span>', { title: true });
    expect(out).toContain("mc-accent");
    expect(out).not.toMatch(/#E5C54F/i);
  });

  it("returns non-strings and empty strings untouched", () => {
    expect(cleanRichText("")).toBe("");
    expect(cleanRichText(undefined as any)).toBe(undefined);
  });
});

describe("kindForSlug", () => {
  it("names the page family from its address", () => {
    expect(kindForSlug("services").kind).toBe("services");
    expect(kindForSlug("services/people-operations").kind).toBe("service");
    expect(kindForSlug("about-us").kind).toBe("about");
    expect(kindForSlug("privacy-policy").kind).toBe("privacy");
    expect(kindForSlug("anything-else").kind).toBe("other");
  });
});
