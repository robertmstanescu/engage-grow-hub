/**
 * The restyle may change how a page looks, never what it says.
 * These tests hold that promise on small hand-made rows; the build
 * script (`scripts/redesign/build-restyle.ts`) holds it again on the
 * real content before it writes any SQL.
 */
import { describe, it, expect } from "vitest";
import { cleanRichText, restyleRows, visibleText, kindForSlug, joinHeroLines, accentSecondLine, accentPhrase, arrangeHome, arrangeServices, arrangeService, arrangeAbout } from "./restyle";

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

describe("canvas arrangements", () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const row = (id: string, type: string, data: Record<string, any>, extra: Record<string, any> = {}) => ({
    id, ...extra,
    columns: [{ id: `${id}-c`, cells: [{ id: `${id}-k`, widgets: [{ id: `${id}-w`, type, data }] }] }],
  });
  const dataOf = (r: any) => r.columns[0].cells[0].widgets[0].data;

  it("joins a hero headline's short lines and keeps the last line apart", () => {
    const rows = [row("h", "hero", { title_lines: ["<p>Your organisation</p>", "<p>has vampires.</p>", "<p>We bring the coffin.</p>"] })];
    joinHeroLines(rows);
    expect(dataOf(rows[0]).title_lines).toEqual(["<p>Your organisation has vampires.</p>", "<p>We bring the coffin.</p>"]);
    joinHeroLines(rows);
    expect(dataOf(rows[0]).title_lines).toHaveLength(2);
  });

  it("accents a second line once and leaves the owner's accent alone", () => {
    expect(accentSecondLine(["<p>One</p>", "<p>Two</p>"])).toEqual(["<p>One</p>", '<p><span class="mc-accent">Two</span></p>']);
    expect(accentSecondLine(["<p>One</p><p>Two</p>"])).toEqual(['<p>One</p><p><span class="mc-accent">Two</span></p>']);
    const own = ['<p><span class="mc-accent">One</span></p>', "<p>Two</p>"];
    expect(accentSecondLine(own)).toBe(own);
    expect(accentPhrase(["<p>Some things. These stay.</p>"], "These stay.")).toEqual(['<p>Some things. <span class="mc-accent">These stay.</span></p>']);
  });

  it("orders the homepage like the artboard and gives each row its gap", () => {
    const out = arrangeHome([
      row("h", "hero", {}),
      row("s", "boxed", { cards: [{ title: "A" }] }),
      row("w", "boxed", { cards: [{ title: "B" }] }),
      row("i", "image_text", { floating_caption: "x", image_position: "left" }),
      row("c", "contact", { title_lines: ["<p>a</p>", "<p>b</p>"] }),
    ]);
    expect(out.map((r) => r.id)).toEqual(["h", "s", "i", "w", "c"]);
    expect(out[0].layout).toMatchObject({ spaceTop: "lead", spaceBottom: "none" });
    expect(dataOf(out[2]).caption_position).toBe("bottom-right");
    expect(dataOf(out[4]).title_lines[1]).toContain("mc-accent");
    expect(arrangeHome(out)).toEqual(out);
  });

  it("moves the Services photo into the hero and its heading over the list, losing no word", () => {
    const before = [
      row("h", "hero", { title_lines: ["<p>Six ways in.</p>"] }),
      row("l", "boxed", { layout_mode: "list", title_lines: ["<p>Our services</p>"], cards: [{ title: "IC" }] }),
      row("p", "image_text", { image_url: "https://example.com/p.webp", image_alt: "Pillars", title_lines: ["<p>Six pillars.</p>"], description: "<p>Pick one.</p>" }),
      row("f", "faq", {}),
    ];
    const out = arrangeServices(JSON.parse(JSON.stringify(before)));
    expect(out.map((r) => r.id)).toEqual(["h", "l", "f"]);
    expect(dataOf(out[0]).visual_image_url).toBe("https://example.com/p.webp");
    expect(dataOf(out[1])).toMatchObject({ eyebrow: "Our services", title_lines: ["<p>Six pillars.</p>"], intro: "<p>Pick one.</p>" });
    const words = (rows: unknown) => visibleText(rows as any).split(/\s+/).sort();
    expect(words(out)).toEqual(words(before));
    expect(arrangeServices(out)).toEqual(out);
  });

  it("gives service and About pages the artboard gaps and survives odd rows", () => {
    const svc = arrangeService([row("h", "hero", {}), row("s", "process_steps", {}), row("t", "service", {}), {} as any]);
    expect(svc[0].layout).toMatchObject({ spaceTop: "lead" });
    expect(dataOf(svc[0]).label_dot).toBe(true);
    expect(svc[1].layout).toMatchObject({ spaceBottom: "near" });
    const about = arrangeAbout([row("h", "hero", { tagline: "A · B", title_lines: ['<p><span class="mc-accent">Slayer.</span></p>'] }), row("p", "profile", {}), {} as any]);
    expect(dataOf(about[0]).tagline_style).toBe("chips");
    expect(dataOf(about[0]).title_lines[0]).toContain("mc-accent-gold");
    expect(dataOf(about[1]).layout_style).toBe("portrait");
  });
});
