import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import "@/widgets";
import { ArticleContext } from "../articleContext";
import ArticleRow from "../ArticleRow";
import { ensureArticleRow, hasArticleRow, makeArticleRow } from "../postRows";
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
    expect(body?.className).toContain("measure");
  });

  it("puts one article row into an empty post and leaves rows that have one alone", () => {
    expect(ensureArticleRow([]).map((r) => r.type)).toEqual(["article"]);
    const withExtras = ensureArticleRow([row("cta_band")], 1).map((r) => r.type);
    expect(withExtras).toEqual(["cta_band", "article"]);
    const keep = [row("article"), row("proof_band")];
    expect(ensureArticleRow(keep)).toBe(keep);
    expect(hasArticleRow([row("text")])).toBe(false);
  });
});
