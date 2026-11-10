/**
 * Gap content adds, it never overwrites; and what it adds follows the
 * selling-copy rules of the brand voice.
 */
import { describe, it, expect } from "vitest";
import { applyGapContent, HOME_PROOF, type GapNote } from "./gapContent";

/* eslint-disable @typescript-eslint/no-explicit-any */
const row = (id: string, type: string, data: Record<string, any>) => ({
  id,
  columns: [{ id: `${id}-c`, cells: [{ id: `${id}-k`, widgets: [{ id: `${id}-w`, type, data }] }] }],
});
const types = (rows: any[]) => rows.map((r) => r.columns[0].cells[0].widgets[0].type);
const dataOf = (rows: any[], type: string) => rows.find((r) => r.columns[0].cells[0].widgets[0].type === type)?.columns[0].cells[0].widgets[0].data;

const home = () => [row("h", "hero", { title_lines: ["<p>Hi</p>"] }), row("b", "boxed", {}), row("c", "contact", { title_lines: ["<p>Lift the lid</p>"] })];
const service = () => [
  row("h", "hero", { answer: "Plain answer.", visual_image_url: "https://example.com/a.webp" }),
  row("s", "service", { services: [{ title: "The Autopsy", subtitle: "Audit", time: "From €900 · 2–3 weeks" }] }),
];

describe("applyGapContent", () => {
  it("adds hero buttons and a proof strip under the hero on the homepage", () => {
    const notes: GapNote[] = [];
    const out = applyGapContent(home(), { kind: "home" }, notes);
    expect(types(out)).toEqual(["hero", "proof_band", "world_map", "boxed", "contact"]);
    expect(dataOf(out, "world_map").worked).toHaveLength(21);
    expect(dataOf(out, "world_map").hr).toHaveLength(15);
    expect(dataOf(out, "world_map").main).toContain("Romania");
    expect(dataOf(out, "hero").cta_url).toBe("#contact");
    expect(dataOf(out, "proof_band").items).toHaveLength(4);
    expect(notes.length).toBeGreaterThan(0);
  });

  it("keeps a button the owner already wrote", () => {
    const rows = home();
    rows[0].columns[0].cells[0].widgets[0].data.cta_label = "Talk to us";
    rows[0].columns[0].cells[0].widgets[0].data.cta_url = "/call";
    const hero = dataOf(applyGapContent(rows, { kind: "home" }), "hero");
    expect(hero.cta_label).toBe("Talk to us");
    expect(hero.cta_url).toBe("/call");
  });

  it("is safe to run twice and leaves its input alone", () => {
    const input = home();
    const frozen = JSON.stringify(input);
    const once = applyGapContent(input, { kind: "home" });
    expect(JSON.stringify(input)).toBe(frozen);
    expect(applyGapContent(once, { kind: "home" })).toEqual(once);
  });

  it("gives a service page its strip, badge, button and the homepage contact block", () => {
    const out = applyGapContent(service(), { kind: "service", pillarSlug: "internal-communications", homeRows: home() });
    const hero = dataOf(out, "hero");
    expect(hero.answer_strip).toBe(true);
    expect(hero.visual_badge_title).toBe("The Autopsy");
    expect(hero.visual_badge_text).toBe("Audit · From €900");
    expect(hero.cta_url).toBe("/#contact");
    expect(types(out).at(-1)).toBe("contact");
    expect(dataOf(out, "contact").title_lines).toEqual(["<p>Lift the lid</p>"]);
    expect(applyGapContent(out, { kind: "service", pillarSlug: "internal-communications", homeRows: home() })).toEqual(out);
  });

  it("does nothing on other pages and survives odd input", () => {
    const rows = home();
    expect(applyGapContent(rows, { kind: "other" })).toEqual(rows);
    expect(applyGapContent(null as any, { kind: "home" })).toEqual([]);
    expect(() => applyGapContent([{} as any], { kind: "service" })).not.toThrow();
  });

  it("adds the artboard's small labels on the homepage, once", () => {
    const rows = [
      row("h", "hero", {}),
      { ...row("v", "boxed", { cards: [{ title: "Precision" }] }), strip_title: "Vows" },
      row("w", "boxed", { cards: [{ title: "The problem", variant: "dark" }, { title: "Who this is for" }] }),
      row("c", "contact", { title_lines: ["<p>Start?</p>"] }),
    ];
    const once = applyGapContent(rows, { kind: "home" });
    const boxed = once.filter((r) => r.columns[0].cells[0].widgets[0].type === "boxed").map((r) => r.columns[0].cells[0].widgets[0].data);
    expect(boxed[0].eyebrow).toBe("Our vows");
    expect(boxed[1].group_label).toBe("The fix");
    expect(dataOf(once, "contact").stamp).toBe("Lid off");
    expect(applyGapContent(once, { kind: "home" })).toEqual(once);
  });

  it("prints each pillar's own tier names and starting price on the Services index", () => {
    const rows = [
      row("h", "hero", {}),
      row("l", "boxed", { layout_mode: "list", cards: [{ title: "Internal Communications", link_url: "/services/internal-communications" }, { title: "Elsewhere", link_url: "/elsewhere" }] }),
    ];
    const serviceRows = { "services/internal-communications": [row("s", "service", { services: [{ title: "The Autopsy", time: "From €900 · 2–3 weeks" }, { title: "The Burial", time: "From €2,250" }] })] };
    const out = applyGapContent(rows, { kind: "services", serviceRows, homeRows: home() });
    const [first, second] = dataOf(out, "boxed").cards;
    expect(first.meta).toBe("The Autopsy · The Burial");
    expect(first.price).toBe("€900");
    expect(first.price_note).toBe("start with The Autopsy, from");
    expect(second.price).toBeUndefined();
    expect(types(out)).toEqual(["hero", "boxed", "contact"]);
    expect(dataOf(out, "hero").cta_label).toBe("Book a free consultation");
  });

  it("uses the About page's own plain answer as its hero intro", () => {
    const out = applyGapContent([row("h", "hero", { answer: "I am Robert & co.", body: "<p></p>" }), row("c", "contact", {})], { kind: "about" });
    expect(dataOf(out, "hero").body).toBe("<p>I am Robert &amp; co.</p>");
    expect(dataOf(out, "contact").stamp).toBe("Lid off");
  });

  it("writes new copy in the house selling voice: no negations, no em dashes", () => {
    const text = [HOME_PROOF.eyebrow, ...HOME_PROOF.items.map((i) => i.label)].join(" ");
    expect(text).not.toMatch(/\b(not|no|never|nobody|nothing|none|without)\b|n't|—/i);
  });
});
