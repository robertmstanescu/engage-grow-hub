/**
 * PrimaryHeadingContext — guarantees every public page has exactly one
 * <h1>.
 *
 * WHY
 * ───
 * Pages are assembled by admins from arbitrary rows. If they omit the
 * Hero row (the usual <h1> owner), the page ships with no top-level
 * heading at all — bad for SEO and for screen-reader navigation.
 *
 * HOW
 * ───
 * `RowsRenderer` scans the normalized rows once and decides which
 * widget should own the page's <h1>:
 *   - a Hero widget with a non-empty title already renders one, so
 *     nothing is promoted;
 *   - otherwise the FIRST widget carrying a non-empty title is
 *     promoted, and its `<RowTitle/>` renders as <h1> instead of <h2>.
 *
 * `WidgetNode` publishes the id of the widget it is currently painting,
 * so `<RowTitle/>` can ask "am I the promoted one?" without any prop
 * drilling through a dozen row renderers.
 */
import { createContext, useContext } from "react";

/** Id of the widget allowed to render the page's <h1> (or null). */
const PromotedWidgetContext = createContext<string | null>(null);
/** Id of the widget currently being painted. */
const CurrentWidgetContext = createContext<string | null>(null);

export const PromotedWidgetProvider = PromotedWidgetContext.Provider;
export const CurrentWidgetProvider = CurrentWidgetContext.Provider;

/** True when the widget being rendered owns the page's <h1>. */
export const useIsPrimaryHeading = (): boolean => {
  const promoted = useContext(PromotedWidgetContext);
  const current = useContext(CurrentWidgetContext);
  return Boolean(promoted && current && promoted === current);
};

/** Strip tags / entities so "<p>&nbsp;</p>" counts as empty. */
export const hasText = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim().length > 0;
};

interface WidgetLike {
  id: string;
  type?: string;
  data?: Record<string, unknown> | null;
}

interface RowLike {
  columns?: Array<{ cells?: Array<{ widgets?: WidgetLike[] }> }>;
}

/** Flatten a v3 row tree into its widgets, in document order. */
export const flattenWidgets = (rows: RowLike[]): WidgetLike[] =>
  rows.flatMap((row) =>
    (row.columns || []).flatMap((column) =>
      (column.cells || []).flatMap((cell) => cell.widgets || []),
    ),
  );

/**
 * Decide which widget (if any) must be promoted to <h1>.
 * Returns null when a Hero already provides a real heading, or when no
 * widget on the page has any title text to promote.
 */
export const resolvePromotedHeadingId = (rows: RowLike[]): string | null => {
  const widgets = flattenWidgets(rows);
  for (const widget of widgets) {
    const data = (widget.data || {}) as Record<string, unknown>;
    if (widget.type === "hero") {
      const lines = Array.isArray(data.title_lines) ? data.title_lines : [];
      if (lines.some((line) => hasText(line))) return null; // Hero owns the h1
      continue;
    }
    const lines = Array.isArray(data.title_lines) ? data.title_lines : [];
    if (hasText(data.title) || hasText(data.heading) || lines.some((line) => hasText(line))) {
      return widget.id;
    }
  }
  return null;
};

/**
 * True when the rows will paint a real heading (Hero <h1> or a widget
 * that can be promoted). Pages whose rows are body-copy only (e.g. a
 * privacy policy) use this to render their own page-title <h1>.
 */
export const rowsProvideHeading = (rows: RowLike[]): boolean => {
  const widgets = flattenWidgets(rows);
  return widgets.some((widget) => {
    const data = (widget.data || {}) as Record<string, unknown>;
    const lines = Array.isArray(data.title_lines) ? data.title_lines : [];
    return hasText(data.title) || hasText(data.heading) || lines.some((line) => hasText(line));
  });
};

/** Strip tags/entities down to plain text — schema.org's Question/Answer
 *  `text` fields expect prose, not markup. */
const stripToPlainText = (html: unknown): string =>
  typeof html === "string"
    ? html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim()
    : "";

export interface FaqSchemaItem {
  question: string;
  answer: string;
}

/**
 * Pull every FAQ widget's question/answer pairs out of a page's rows,
 * in document order, for a `FAQPage` JSON-LD block. Reuses the same v3
 * tree-walk as heading promotion above rather than re-deriving it, so
 * the two stay consistent as the row schema evolves.
 */
export const extractFaqItems = (rows: RowLike[]): FaqSchemaItem[] => {
  const items: FaqSchemaItem[] = [];
  for (const widget of flattenWidgets(rows)) {
    if (widget.type !== "faq") continue;
    const data = (widget.data || {}) as Record<string, unknown>;
    const faqItems = Array.isArray(data.items) ? data.items : [];
    for (const raw of faqItems as Array<{ question?: unknown; answer?: unknown }>) {
      const question = typeof raw.question === "string" ? raw.question.trim() : "";
      const answer = stripToPlainText(raw.answer);
      if (question && answer) items.push({ question, answer });
    }
  }
  return items;
};
