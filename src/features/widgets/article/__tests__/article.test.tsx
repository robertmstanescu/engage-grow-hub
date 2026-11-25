import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import "@/widgets";
import { ArticleContext } from "../articleContext";
import ArticleRow from "../ArticleRow";
import { ensureArticleRow, postRowsFor, hasArticleRow, makeArticleRow, tryThisFromRows, withNextStep, NEXT_STEP_ROW_ID } from "../postRows";
import type { PageRow } from "@/types/rows";

const row = (type: string, id = type): PageRow => ({ id, type, content: {} } as PageRow);

describe("article block", () => {
  it("renders nothing outside a post", () => {
    const { container } = render(<ArticleRow row={makeArticleRow()} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders the post's HTML inside a post", () => {
    const { container } = render(
      <ArticleContext.Provider value={{ html: "<p>Hello</p><h2>Section</h2>" }}>
        <ArticleRow row={makeArticleRow()} />
      </ArticleContext.Provider>,
    );
    const body = container.querySelector("[data-article-body]");
    expect(body?.innerHTML).toContain("<h2>Section</h2>");
    // The reading column is the artboard's 720px `.article-column`.
    expect(container.querySelector("section")?.className).toContain("article-column");
  });

  it("gives a post that was never arranged the band and three more posts, and leaves saved rows alone", () => {
    const fresh = postRowsFor(null, "<p>Hi</p>", { title_line1: "A <b>", title_line2: "B", body: "C" }, "Pay");
    expect(fresh.map((r) => r.type)).toEqual(["article", "cta_band", "from_the_blog"]);
    expect(fresh[1].content.title_lines[0]).toBe("A &lt;b&gt;");
    expect(fresh[1].content.band_style).toBe("room");
    expect(fresh[2].content.categories).toEqual(["Pay"]);
    const saved = postRowsFor([makeArticleRow("x")], "<p>Hi</p>");
    expect(saved.map((r) => r.type)).toEqual(["article"]);
  });

  it("puts one article row into an empty post and leaves rows that have one alone", () => {
    expect(ensureArticleRow([]).map((r) => r.type)).toEqual(["article"]);
    const withExtras = ensureArticleRow([row("cta_band")], 1).map((r) => r.type);
    expect(withExtras).toEqual(["cta_band", "article"]);
    const keep = [row("article"), row("proof_band")];
    expect(ensureArticleRow(keep)).toBe(keep);
    expect(hasArticleRow([row("text")])).toBe(false);
  });

  it("turns an old seeded copy of the article into the Article block instead of adding a second copy", () => {
    const html = "<p>On 3 September 2026, the rules changed.</p>";
    const seededV1 = { id: "seed", type: "text", content: { body: html } } as unknown as PageRow;
    const out = ensureArticleRow([row("cta_band"), seededV1], 0, html).map((r) => r.type);
    expect(out).toEqual(["cta_band", "article"]);
    const seededV3 = { id: "seed3", schema_version: 3, columns: [{ id: "c", cells: [{ id: "ce", widgets: [{ id: "w", type: "text", data: { body: " " + html + "\n" } }] }] }] } as unknown as PageRow;
    expect(ensureArticleRow([seededV3], 0, html).map((r) => r.type)).toEqual(["article"]);
    const other = { id: "t", type: "text", content: { body: "<p>Different words.</p>" } } as unknown as PageRow;
    expect(ensureArticleRow([other], 0, html).map((r) => r.type)).toEqual(["article", "text"]);
  });

  describe("next step under a service post (25 Nov 2026)", () => {
    const tip = "<p><strong>Try this before your next pay review:</strong> pick one role.</p>";
    const servicePage = [
      { id: "r", schema_version: 3, columns: [{ id: "c", cells: [{ id: "ce", widgets: [{ id: "w", type: "image_text", data: { description: "<p>Lead.</p>" + tip + "<p>After.</p>" } }] }] }] },
    ];

    it("reads the Try this paragraph from the service page", () => {
      expect(tryThisFromRows(servicePage)).toBe(tip);
      expect(tryThisFromRows([])).toBe("");
      expect(tryThisFromRows(null)).toBe("");
    });

    it("puts the paragraph and the service link between the article and the band", () => {
      const fresh = postRowsFor(null, "<p>Hi</p>", {}, "Pay Transparency", tip);
      expect(fresh.map((r) => r.type)).toEqual(["article", "boxed", "cta_band", "from_the_blog"]);
      const card = fresh[1].content.cards[0];
      expect(card.body).toBe(tip);
      expect(card.cta_label).toBe("Explore Pay Transparency");
      expect(card.cta_url).toBe("/services/pay-transparency/");
    });

    it("adds the same row to saved rows, before their band, and leaves General posts alone", () => {
      const saved = [makeArticleRow("a"), row("text"), row("cta_band")];
      expect(postRowsFor(saved, "", {}, "Pay Transparency", tip).map((r) => r.type)).toEqual(["article", "text", "boxed", "cta_band"]);
      expect(withNextStep([makeArticleRow("a"), row("text")], "Pay Transparency", tip).map((r) => r.type)).toEqual(["article", "boxed", "text"]);
      expect(postRowsFor(saved, "", {}, "General", tip)).toEqual(saved);
      const twice = withNextStep(withNextStep(saved, "Pay Transparency", ""), "Pay Transparency", tip);
      expect(twice.filter((r) => r.id === NEXT_STEP_ROW_ID)).toHaveLength(1);
      expect(twice.find((r) => r.id === NEXT_STEP_ROW_ID)?.content.cards[0].body).toBe(tip);
    });
  });
});
