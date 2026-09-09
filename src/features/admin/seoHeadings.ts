import type { PageRow } from "@/types/rows";
import { findMissingAltViolations } from "@/services/contentAccessibility";
import { findWidgetsByType } from "@/lib/rowWidgets";
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


/** The hero's plain answer in a row set, or "". */
export const heroAnswerOf = (rows: unknown): string => {
  if (!Array.isArray(rows)) return "";
  const hero = findWidgetsByType(normalizeRowsToV3(rows) as never, "hero")[0];
  return ((hero?.data as { answer?: string } | undefined)?.answer || "").trim();
};

export const wordCount = (s: string): number => (s.trim() ? s.trim().split(/\s+/).length : 0);

export interface SeoCheck { key: string; ok: boolean; label: string; detail: string }

/**
 * The checklist for one page, in words. Thresholds follow what search
 * results actually show: titles 50–60 characters, descriptions 120–155,
 * one H1, a plain answer of 25–45 words, alt text on every picture.
 */
export const seoChecks = (page: { title: string; metaTitle: string; metaDescription: string; h1s: string[]; answer: string; rows?: unknown; isPost?: boolean }): SeoCheck[] => {
  const title = (page.metaTitle || page.title || "").trim();
  const desc = (page.metaDescription || "").trim();
  const checks: SeoCheck[] = [];
  checks.push(title.length === 0 ? { key: "title", ok: false, label: "No search title", detail: "Add one, 50–60 characters." }
    : title.length < 50 ? { key: "title", ok: false, label: "Search title short", detail: `${title.length} characters; aim for 50–60.` }
    : title.length > 60 ? { key: "title", ok: false, label: "Search title long", detail: `${title.length} characters; Google cuts at about 60.` }
    : { key: "title", ok: true, label: "Search title", detail: `${title.length} characters.` });
  checks.push(desc.length === 0 ? { key: "description", ok: false, label: "No search description", detail: "Add one, 120–155 characters." }
    : desc.length < 120 ? { key: "description", ok: false, label: "Description short", detail: `${desc.length} characters; aim for 120–155.` }
    : desc.length > 155 ? { key: "description", ok: false, label: "Description long", detail: `${desc.length} characters; Google cuts at about 155.` }
    : { key: "description", ok: true, label: "Search description", detail: `${desc.length} characters.` });
  checks.push(page.h1s.length === 1 ? { key: "h1", ok: true, label: "One headline", detail: page.h1s[0].slice(0, 60) }
    : page.h1s.length === 0 ? { key: "h1", ok: false, label: "No headline", detail: "The page has no H1." }
    : { key: "h1", ok: false, label: `${page.h1s.length} headlines`, detail: "A page should have exactly one H1." });
  if (!page.isPost) {
    const w = wordCount(page.answer);
    checks.push(w === 0 ? { key: "answer", ok: false, label: "No plain answer", detail: "One or two plain sentences under the headline." }
      : w < 25 || w > 45 ? { key: "answer", ok: false, label: "Plain answer length", detail: `${w} words; aim for 25–45.` }
      : { key: "answer", ok: true, label: "Plain answer", detail: `${w} words.` });
    if (Array.isArray(page.rows)) {
      const missing = findMissingAltViolations(page.rows as PageRow[]).length;
      checks.push(missing === 0 ? { key: "alt", ok: true, label: "Pictures described", detail: "Every picture has alt text." }
        : { key: "alt", ok: false, label: `${missing} picture${missing === 1 ? "" : "s"} without alt text`, detail: "Add a description in the picture's block or in Media." });
    }
  }
  return checks;
};
