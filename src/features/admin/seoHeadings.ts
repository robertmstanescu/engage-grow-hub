import { normalizeRowsToV3 } from "@/lib/migrations/rowMigrations";
import { isHeroRow } from "@/features/site/pageMesh";

/**
 * seoHeadings — the headings a page's rows produce, as the site renders
 * them: one H1 (the hero's title, or the first titled row when there is
 * no hero), H2s for every other titled row.
 *
 * Rows are read through `normalizeRowsToV3`, so v1 (`row.content`), v2
 * and v3 (type and data on the WIDGET) all count. The old audit read
 * `row.content` only and reported every v3 page as "missing H1".
 */

export const stripHtml = (input: unknown): string => {
  if (typeof input !== "string") return "";
  return input.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
};

export const titleLinesToStrings = (data: unknown): string[] => {
  if (!data || typeof data !== "object") return [];
  const lines = (data as { title_lines?: unknown }).title_lines;
  if (!Array.isArray(lines)) return [];
  const out: string[] = [];
  for (const line of lines) {
    const raw = typeof line === "string" ? line : (line as { text?: string })?.text ?? "";
    const text = stripHtml(raw);
    if (text) out.push(text);
  }
  return out;
};

/** The title of a row = the title of its first titled widget, joined the way the site joins lines. */
const rowTitle = (row: ReturnType<typeof normalizeRowsToV3>[number]): string => {
  for (const col of row.columns ?? []) {
    for (const cell of col.cells ?? []) {
      for (const w of cell.widgets ?? []) {
        const lines = titleLinesToStrings((w as { data?: unknown }).data);
        if (lines.length) return lines.join(" ");
      }
    }
  }
  return "";
};

export const extractHeadings = (rows: unknown): { h1s: string[]; h2s: string[] } => {
  const acc = { h1s: [] as string[], h2s: [] as string[] };
  if (!Array.isArray(rows)) return acc;
  const v3 = normalizeRowsToV3(rows);
  const heroIdx = v3.findIndex((r) => isHeroRow(r));
  v3.forEach((row, i) => {
    const title = rowTitle(row);
    if (!title) return;
    if (i === heroIdx) acc.h1s.push(title);
    else acc.h2s.push(title);
  });
  if (heroIdx === -1 && acc.h1s.length === 0 && acc.h2s.length > 0) acc.h1s.push(acc.h2s.shift() as string);
  return acc;
};
