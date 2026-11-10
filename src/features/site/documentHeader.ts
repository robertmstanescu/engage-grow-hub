/**
 * Document pages (a privacy policy is the classic case) show their
 * heading ABOVE the glass card and the article inside it. The stored
 * page keeps one text block with a small heading, a title, a date line
 * and a body; this lifts the first three out at render time so the
 * page component can print them as the page header. Stored rows are
 * never changed, and no word is added or removed.
 */
import type { PageRow } from "@/types/rows";

export interface DocumentHeader {
  eyebrow: string;
  /** Title lines as stored (may carry inline HTML); sanitise before printing. */
  titleLines: string[];
  subtitle: string;
}

type Loose = Record<string, unknown>;

const asRecord = (v: unknown): Loose | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Loose) : null;

/** The first widget of the first row, when it is a text block (v3 shape). */
const firstTextWidget = (row: unknown): Loose | null => {
  const columns = asRecord(row)?.columns;
  if (!Array.isArray(columns)) return null;
  const cells = asRecord(columns[0])?.cells;
  if (!Array.isArray(cells)) return null;
  const widgets = asRecord(cells[0])?.widgets;
  if (!Array.isArray(widgets)) return null;
  const widget = asRecord(widgets[0]);
  return widget && widget.type === "text" && asRecord(widget.data) ? widget : null;
};

const text = (v: unknown): string => (typeof v === "string" ? v : "");

/**
 * Splits the heading off a document page. Answers `header: null` and the
 * rows untouched when the first block is not a titled text block, so a
 * page built some other way renders exactly as before.
 */
export const splitDocumentHeader = (
  rows: PageRow[],
): { header: DocumentHeader | null; rows: PageRow[] } => {
  try {
    const widget = firstTextWidget(rows[0]);
    const data = widget ? asRecord(widget.data) : null;
    if (!data) return { header: null, rows };

    const titleLines = (Array.isArray(data.title_lines) ? data.title_lines : [])
      .filter((l): l is string => typeof l === "string" && l.replace(/<[^>]+>/g, "").trim() !== "");
    if (titleLines.length === 0) return { header: null, rows };

    const header: DocumentHeader = {
      eyebrow: text(data.eyebrow),
      titleLines,
      subtitle: text(data.subtitle),
    };

    // Deep copy of the first row only; the header fields are blanked so
    // the text block prints the body alone.
    const first = JSON.parse(JSON.stringify(rows[0])) as PageRow;
    const copy = firstTextWidget(first);
    const copyData = copy ? asRecord(copy.data) : null;
    if (!copyData) return { header: null, rows };
    copyData.eyebrow = "";
    copyData.title_lines = [];
    copyData.subtitle = "";

    return { header, rows: [first, ...rows.slice(1)] };
  } catch {
    // A page must never fail to render over its heading.
    return { header: null, rows };
  }
};
