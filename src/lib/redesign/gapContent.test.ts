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
    expect(applyGapContent(rows, { kind: "about" })).toEqual(rows);
    expect(applyGapContent(null as any, { kind: "home" })).toEqual([]);
    expect(() => applyGapContent([{} as any], { kind: "service" })).not.toThrow();
  });

  it("writes new copy in the house selling voice: no negations, no em dashes", () => {
    const text = [HOME_PROOF.eyebrow, ...HOME_PROOF.items.map((i) => i.label)].join(" ");
    expect(text).not.toMatch(/\b(not|no|never|nobody|nothing|none|without)\b|n't|—/i);
  });
});
