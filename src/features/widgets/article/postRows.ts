import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT, generateRowId } from "@/lib/constants/rowDefaults";
import { findWidgetsByType } from "@/lib/rowWidgets";
import { PILLAR_KEY_TO_SLUG } from "@/lib/constants/pillarColors";
import { PILLAR_NAMES } from "@/features/site/work/workLabels";

/**
 * The service page an article's category belongs to (US15). Categories
 * are the six service names plus General, which has none.
 */
export const serviceForCategory = (category?: string | null): { name: string; path: string; pageSlug: string } | null => {
  const wanted = (category || "").trim().toLowerCase();
  if (!wanted) return null;
  for (const [key, slug] of Object.entries(PILLAR_KEY_TO_SLUG)) {
    const name = PILLAR_NAMES[key];
    if (name && name.toLowerCase() === wanted) return { name, path: `/services/${slug}/`, pageSlug: `services/${slug}` };
  }
  return null;
};

/** A paragraph that opens with a bold "Try this…" lead. */
const TRY_THIS = /<p>\s*<strong>\s*Try this[\s\S]*?<\/p>/i;

/**
 * The "Try this" paragraph of a service page (owner, 25 Nov 2026): the
 * paragraph opening with a bold "Try this…" in the page's "What good
 * looks like" image-and-text block. It stays written in one place, the
 * service page, and blog posts in that service's category borrow it as
 * their next step. Returns "" when the page has none.
 */
export const tryThisFromRows = (rows: unknown): string => {
  if (!Array.isArray(rows)) return "";
  for (const w of findWidgetsByType(rows as never, "image_text")) {
    const data = (w as { data?: Record<string, unknown> }).data || {};
    for (const value of Object.values(data)) {
      if (typeof value !== "string") continue;
      const hit = TRY_THIS.exec(value);
      if (hit) return hit[0];
    }
  }
  return "";
};

/** Id of the next-step row, so it is added once and found again. */
export const NEXT_STEP_ROW_ID = "post-default-service";

/**
 * The next step under a post in a service category: the service's
 * "Try this" paragraph and a link to the service. Without the paragraph
 * (not loaded yet, or none written) it is the plain related-service card.
 */
export const makeNextStepRow = (service: { name: string; path: string }, tryThis = ""): PageRow =>
  ({
    id: NEXT_STEP_ROW_ID, type: "boxed", strip_title: "Related service", bg_color: "",
    content: {
      eyebrow: "Related service",
      cards: [{
        title: service.name,
        body: tryThis,
        link_url: service.path,
        cta_url: service.path,
        cta_label: tryThis ? `Explore ${service.name}` : "See the service",
      }],
    },
    layout: { ...DEFAULT_ROW_LAYOUT },
  }) as PageRow;

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
 * builder (BlogPost artboard): the related service card for the post's
 * category (none for General), the dark call-to-action band, then three
 * more posts. They are ordinary rows, so the builder shows them, and the
 * owner can edit or remove them like any other block. A post whose rows
 * were saved keeps exactly what was saved.
 */
export const defaultPostExtras = (closing: ClosingWords = {}, category?: string | null, tryThis = ""): PageRow[] => {
  const line1 = (closing.title_line1 || "Not sure where to start?").trim();
  const line2 = (closing.title_line2 || "Lift the lid first.").trim();
  const body = (closing.body || "").trim();
  const service = serviceForCategory(category);
  return [
    // US15 + the next step (25 Nov 2026): the related service with its "Try this" paragraph.
    ...(service ? [makeNextStepRow(service, tryThis)] : []),
    {
      id: "post-default-cta", type: "cta_band", strip_title: "Call to action", bg_color: "",
      content: {
        band_style: "room",
        eyebrow: "What to do about it",
        title_lines: [esc(line1), `<span class="mc-accent">${esc(line2)}</span>`],
        body: body ? `<p>${esc(body)}</p>` : "",
        button_text: "Book a free call",
        button_url: "/#contact",
      },
      layout: { ...DEFAULT_ROW_LAYOUT, spaceTop: "none", spaceBottom: "none" },
    },
    {
      id: "post-default-more", type: "from_the_blog", strip_title: "Keep reading", bg_color: "",
      content: { eyebrow: "Keep reading", title: "More on people, communication and pay", limit: 3, categories: category ? [category] : [] },
      layout: { ...DEFAULT_ROW_LAYOUT },
    },
  ] as PageRow[];
};

/**
 * Saved rows with the next step in place (owner, 25 Nov 2026): a related
 * service row already there is refreshed, otherwise the row goes in just
 * before the first call-to-action band, or straight after the article
 * when there is no band. General posts come back unchanged.
 */
export const withNextStep = (rows: PageRow[], category?: string | null, tryThis = ""): PageRow[] => {
  const service = serviceForCategory(category);
  if (!service) return rows;
  const step = makeNextStepRow(service, tryThis);
  const existing = rows.findIndex((r) => r.id === NEXT_STEP_ROW_ID);
  if (existing >= 0) return rows.map((r, i) => (i === existing ? step : r));
  const band = rows.findIndex((r) => r.type === "cta_band" || findWidgetsByType([r] as never, "cta_band").length > 0);
  const at = band >= 0 ? band : articleRowIndex(rows) + 1;
  return [...rows.slice(0, at), step, ...rows.slice(at)];
};

/** A post's rows as the page shows them: saved rows (plus the next step), or the article and its default extras. */
export const postRowsFor = (saved: PageRow[] | null | undefined, articleHtml: string, closing?: ClosingWords, category?: string | null, tryThis = ""): PageRow[] =>
  saved && saved.length > 0
    ? withNextStep(ensureArticleRow(saved, 0, articleHtml), category, tryThis)
    : [makeArticleRow("post-article"), ...defaultPostExtras(closing, category, tryThis)];
