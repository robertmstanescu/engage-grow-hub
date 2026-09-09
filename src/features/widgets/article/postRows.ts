import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT, generateRowId } from "@/lib/constants/rowDefaults";
import { findWidgetsByType } from "@/lib/rowWidgets";

/**
 * A blog post is its article. Rows are extras placed around it. These
 * helpers keep exactly one article block in a post's rows: the public
 * page renders `[article]` when a post has no rows at all, and the
 * builder puts the block back if it is ever removed.
 */

export const makeArticleRow = (id: string = generateRowId()): PageRow =>
  ({ id, type: "article", strip_title: "Article", bg_color: "", content: {}, layout: { ...DEFAULT_ROW_LAYOUT } }) as PageRow;

export const hasArticleRow = (rows: PageRow[]): boolean =>
  findWidgetsByType(rows as never, "article").length > 0;

const norm = (html: unknown) => (typeof html === "string" ? html.replace(/\s+/g, " ").trim() : "");

/** Body HTML of a v1 text row or of a v3 row whose first widget is a text block. */
const textRowBody = (row: PageRow): string => {
  const r = row as unknown as { type?: string; content?: { body?: unknown }; columns?: Array<{ cells?: Array<{ widgets?: Array<{ type?: string; data?: { body?: unknown } }> }> }> };
  if (r.type === "text") return norm(r.content?.body);
  const w = r.columns?.[0]?.cells?.[0]?.widgets?.[0];
  if (w?.type === "text") return norm(w.data?.body);
  return "";
};

/**
 * Rows with the article present. A Text row holding a copy of the
 * article (the old builder seeded one) becomes the Article block in
 * place, so the words never show twice; otherwise the block is inserted
 * at `at` (default: the top).
 */
export const ensureArticleRow = (rows: PageRow[], at = 0, articleHtml?: string): PageRow[] => {
  if (hasArticleRow(rows)) return rows;
  const wanted = norm(articleHtml);
  if (wanted) {
    const copyIdx = rows.findIndex((r) => textRowBody(r) === wanted);
    if (copyIdx >= 0) return rows.map((r, i) => (i === copyIdx ? makeArticleRow(r.id) : r));
  }
  const idx = Math.max(0, Math.min(at, rows.length));
  return [...rows.slice(0, idx), makeArticleRow(), ...rows.slice(idx)];
};

/** Index of the article row (v1 shape), or -1. */
export const articleRowIndex = (rows: PageRow[]): number => rows.findIndex((r) => r.type === "article");
