import type { PageRow } from "@/types/rows";
import { getRowColumns } from "@/lib/constants/rowDefaults";

/** True when a string carries visible text once tags are stripped ("<p></p>" does not). */
export const hasText = (v: unknown): boolean =>
  typeof v === "string" && v.replace(/<[^>]*>/g, "").trim().length > 0;

const columnHasContent = (c: Record<string, unknown>) =>
  hasText(c.eyebrow) || hasText(c.subtitle) || hasText(c.body) || hasText(c.note) ||
  (Array.isArray(c.title_lines) && c.title_lines.some(hasText)) ||
  hasText(c.cta_label) || Boolean(c.show_subscribe);

/**
 * True when a text widget has nothing to show. An empty text widget must
 * paint NOTHING on the public site, like the other row types (quote
 * band, CTA band, FAQ…): the registry's `render` returns null for it, so
 * WidgetNode drops the widget's wrapper too — otherwise the wrapper still
 * takes a slot in the cell's flex column and its `gap` adds 24px of
 * blank per forgotten widget (three of them in a hero row were enough to
 * throw that row's height and centring off). The builder still shows a
 * selectable placeholder for a null render.
 *
 * Kept out of TextRow.tsx so that file exports only a component.
 */
export const isTextRowEmpty = (row: PageRow): boolean => {
  const { contents, isMultiCol } = getRowColumns(row);
  const coverImage = !isMultiCol ? (row.content?.cover_image?.trim() || undefined) : undefined;
  return !coverImage && !contents.some((c) => columnHasContent(c as Record<string, unknown>));
};
