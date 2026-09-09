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

/** Rows with the article present; inserted at `at` (default: the top) when missing. */
export const ensureArticleRow = (rows: PageRow[], at = 0): PageRow[] => {
  if (hasArticleRow(rows)) return rows;
  const idx = Math.max(0, Math.min(at, rows.length));
  return [...rows.slice(0, idx), makeArticleRow(), ...rows.slice(idx)];
};

/** Index of the article row (v1 shape), or -1. */
export const articleRowIndex = (rows: PageRow[]): number => rows.findIndex((r) => r.type === "article");
