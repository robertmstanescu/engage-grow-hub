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

/** The closing words the site already uses in its contact block. */
export interface ClosingWords { title_line1?: string; title_line2?: string; body?: string }

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * What follows the article on a post that has never been arranged in the
 * builder (BlogPost artboard): the dark call-to-action band, then three
 * more posts. They are ordinary rows, so the builder shows them, and the
 * owner can edit or remove them like any other block. A post whose rows
 * were saved keeps exactly what was saved.
 */
export const defaultPostExtras = (closing: ClosingWords = {}, category?: string | null): PageRow[] => {
  const line1 = (closing.title_line1 || "Not sure where to start?").trim();
  const line2 = (closing.title_line2 || "Lift the lid first.").trim();
  const body = (closing.body || "").trim();
  return [
    {
      id: "post-default-cta", type: "cta_band", strip_title: "Call to action", bg_color: "",
      content: {
        band_style: "room",
        eyebrow: "What to do about it",
        title_lines: [esc(line1), `<span class="mc-accent">${esc(line2)}</span>`],
        body: body ? `<p>${esc(body)}</p>` : "",
        button_text: "Book a free consultation",
        button_url: "/#contact",
      },
      layout: { ...DEFAULT_ROW_LAYOUT, spaceTop: "none", spaceBottom: "none" },
    },
    {
      id: "post-default-more", type: "from_the_blog", strip_title: "Keep reading", bg_color: "",
      content: { eyebrow: "Keep reading", title: "More on people, pay and AI", limit: 3, categories: category ? [category] : [] },
      layout: { ...DEFAULT_ROW_LAYOUT },
    },
  ] as PageRow[];
};

/** A post's rows as the page shows them: saved rows, or the article and its default extras. */
export const postRowsFor = (saved: PageRow[] | null | undefined, articleHtml: string, closing?: ClosingWords, category?: string | null): PageRow[] =>
  saved && saved.length > 0
    ? ensureArticleRow(saved, 0, articleHtml)
    : [makeArticleRow("post-article"), ...defaultPostExtras(closing, category)];
