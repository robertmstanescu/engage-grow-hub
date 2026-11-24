/**
 * Guards for the Work portfolio data: database limits, the owner's
 * voice rules, honesty labels, images and internal links.
 */
import fs from "node:fs";
import path from "node:path";
import { WORK_PORTFOLIO } from "./entries";
import { buildCaseRows, coverPath, diagramPath, ogPath, reviewList, visibleCopy } from "./portfolio";

const slugs = new Set(WORK_PORTFOLIO.map((e) => e.slug));
const publicFile = (p: string) => path.join(__dirname, "../../../public", p);

describe("work portfolio data", () => {
  it("has the 21 pieces, numbered once each, with unique slugs", () => {
    expect(WORK_PORTFOLIO).toHaveLength(21);
    expect(new Set(WORK_PORTFOLIO.map((e) => e.n)).size).toBe(21);
    expect(slugs.size).toBe(21);
  });

  it.each(WORK_PORTFOLIO.map((e) => [e.slug, e]))("%s fits the database and search limits", (_s, e) => {
    expect(e.title.length).toBeLessThanOrEqual(72); // work_items_title_check
    expect(e.summary.length).toBeLessThanOrEqual(140); // work_items_summary_check
    expect(e.metaTitle.length).toBeLessThanOrEqual(60);
    expect(e.metaDescription.length).toBeLessThanOrEqual(155);
    expect(e.metaDescription.length).toBeGreaterThan(70);
    expect(e.aiSummary.length).toBeGreaterThan(120);
    expect(e.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it.each(WORK_PORTFOLIO.map((e) => [e.slug, e]))("%s follows the voice rules", (_s, e) => {
    for (const text of visibleCopy(e)) {
      expect(text).not.toMatch(/[—–]/); // no em or en dashes
      // "learning journey" is HowNow's own name for the feature, so it stays.
      expect(text).not.toMatch(/\b(actually|genuinely|crucial|seamless(ly)?|robust|showcase|(?<!learning )journey|landscape|delve|leverage[sd]?|transformative|game-changing|cutting-edge)\b/i);
      expect(text).not.toMatch(/\w+, \w+, and \w+/); // no Oxford comma in simple lists
    }
  });

  it.each(WORK_PORTFOLIO.map((e) => [e.slug, e]))("%s carries the right honesty label", (_s, e) => {
    if (e.type === "playbook") expect(e.honestyLabel).toContain("Illustrative example, not client work");
    if (e.type === "case") expect(e.honestyLabel).toMatch(/^Real work/);
    if ([17, 18, 19].includes(e.n)) expect(e.honestyLabel).toContain("Not legal advice");
  });

  it.each(WORK_PORTFOLIO.map((e) => [e.slug, e]))("%s has alt text and every image on disk", (_s, e) => {
    expect(e.cover.alt.length).toBeGreaterThan(15);
    for (const p of [coverPath(e.slug), ogPath(e.slug), diagramPath(e.slug)]) expect(fs.existsSync(publicFile(p))).toBe(true);
    for (const row of buildCaseRows(e)) {
      if (row.type === "image") expect(String(row.content.alt_text || "").length).toBeGreaterThan(15);
      if (row.type === "quote_band" && row.content.avatar) expect(fs.existsSync(publicFile(String(row.content.avatar)))).toBe(true);
    }
  });

  it.each(WORK_PORTFOLIO.map((e) => [e.slug, e]))("%s links only to pages that exist", (_s, e) => {
    const html = JSON.stringify(buildCaseRows(e));
    const links = [...html.matchAll(/href=\\"(\/[^"\\]*)\\"/g)].map((m) => m[1]);
    expect(links.length).toBeGreaterThan(0); // every piece links on to more of the site
    for (const href of links) {
      const work = href.match(/^\/work\/([a-z0-9-]+)\/$/);
      if (work) expect(slugs.has(work[1])).toBe(true);
      else expect(href).toMatch(/^\/services\/(internal-communications|employee-experience|people-operations|fractional-hrbp|pay-transparency|manager-enablement)$/);
    }
    for (const r of e.related) expect(slugs.has(r)).toBe(true);
  });

  it("names the employer on every real-work label (owner's go-ahead, 24 Nov 2026)", () => {
    for (const e of WORK_PORTFOLIO.filter((x) => x.type === "case")) {
      expect(e.honestyLabel).toMatch(/^Real work, (South Pole|Klarna)/);
    }
  });

  it("collects every reconstructed step for the owner to check", () => {
    const list = reviewList(WORK_PORTFOLIO);
    expect(list.reduce((n, e) => n + e.reconstructed.length, 0)).toBeGreaterThan(10);
    for (const e of list) expect(e.questions.length).toBeGreaterThan(0);
  });
});
