/**
 * contentAccessibility — publish-time accessibility (WCAG) gate.
 *
 * EPIC 13 / US 13.1: when an editor clicks "Publish Draft" the system
 * MUST scan every widget on the page and refuse to promote the draft
 * to live content if any image lacks descriptive alt text.
 *
 * This file owns the rule so all three publish flows (site sections,
 * CMS pages, blog posts) stay in lock-step. Adding a new image-bearing
 * widget? Extend `collectImageRefsFromRow` here and every publish path
 * gets the check for free.
 *
 * Why scan client-side at publish time, not via a DB constraint?
 * --------------------------------------------------------------
 *   • Page rows are heterogeneous JSON blobs. A CHECK constraint can't
 *     traverse them.
 *   • The error needs to surface in the editor UI with a per-widget
 *     hint, not as a Postgres exception code.
 *   • The DB still reflects the rule via RLS (admins-only writes); this
 *     adds an editorial guardrail on top of those access controls.
 */

import type { PageRow } from "@/types/rows";

/* ────────────────────────────────────────────────────────────────
 * Image-bearing widgets
 * ────────────────────────────────────────────────────────────────
 * Each widget that can render an <img> registers its image fields
 * here. The pair (urlField, altField) is what the validator inspects.
 *
 * If a widget is missing from this map, it simply isn't checked —
 * that's intentional so we don't falsely block widgets that happen
 * to store a URL for some non-image purpose.
 */
type ImageFieldDescriptor = {
  /** Path inside `row.content` (dot notation) to the image URL. */
  urlPath: string;
  /** Path inside `row.content` (dot notation) to the alt text. */
  altPath: string;
  /** Friendly label shown in the toast, e.g. "Image", "Hero background". */
  label: string;
};

const IMAGE_FIELDS_BY_TYPE: Partial<Record<PageRow["type"], ImageFieldDescriptor[]>> = {
  // Standalone Image widget — the canonical case.
  image: [{ urlPath: "url", altPath: "alt_text", label: "Image" }],
  // Image + Text composite — the image half must still meet WCAG.
  image_text: [{ urlPath: "image_url", altPath: "image_alt", label: "Image + Text" }],
  // Boxed row's optional cover image (flat, row-level field — not per-card).
  boxed: [{ urlPath: "cover_image", altPath: "cover_image_alt", label: "Cover image" }],
  // Hero row's optional foreground visual, alongside the existing bg_url.
  hero: [{ urlPath: "visual_image_url", altPath: "visual_image_alt", label: "Hero visual" }],
  // Every other row type also carries the same optional cover-image
  // capability (RowCoverCard, src/features/site/RowCoverCard.tsx) — one
  // flat, row-level field pair, same convention as `boxed` above.
  text: [{ urlPath: "cover_image", altPath: "cover_image_alt", label: "Cover image" }],
  service: [{ urlPath: "cover_image", altPath: "cover_image_alt", label: "Cover image" }],
  grid: [{ urlPath: "cover_image", altPath: "cover_image_alt", label: "Cover image" }],
  lead_magnet: [{ urlPath: "cover_image", altPath: "cover_image_alt", label: "Cover image" }],
  testimonial: [{ urlPath: "cover_image", altPath: "cover_image_alt", label: "Cover image" }],
  logo_cloud: [{ urlPath: "cover_image", altPath: "cover_image_alt", label: "Cover image" }],
  faq: [{ urlPath: "cover_image", altPath: "cover_image_alt", label: "Cover image" }],
  proof_band: [{ urlPath: "cover_image", altPath: "cover_image_alt", label: "Cover image" }],
  process_steps: [{ urlPath: "cover_image", altPath: "cover_image_alt", label: "Cover image" }],
  quote_band: [{ urlPath: "cover_image", altPath: "cover_image_alt", label: "Cover image" }],
  cta_band: [{ urlPath: "cover_image", altPath: "cover_image_alt", label: "Cover image" }],
  contact: [{ urlPath: "cover_image", altPath: "cover_image_alt", label: "Cover image" }],
};

/* ─────────────────────────────────────────────────────────────── */

const getPath = (obj: any, path: string): unknown => {
  if (!obj || typeof obj !== "object") return undefined;
  return path.split(".").reduce<any>((acc, key) => (acc == null ? acc : acc[key]), obj);
};

const isMissingAlt = (alt: unknown): boolean =>
  typeof alt !== "string" || alt.trim().length === 0;

export interface AccessibilityViolation {
  rowId: string;
  rowType: PageRow["type"];
  /** Human-readable widget label for the toast. */
  label: string;
  /** Strip title (the editor-assigned name) — helps the user locate the row. */
  stripTitle: string;
}

/**
 * Yield every widget in the row array, across all three content shapes
 * a row can be stored in (see `src/lib/rowWidgets.ts` for the full
 * history):
 *   v1 — the row itself IS the widget: `{ id, type, content }`
 *   v2 — `row.columns[].widgets[]`
 *   v3 — `row.columns[].cells[].widgets[]` (current/canonical shape)
 *
 * This MUST NOT assume v1: every page saved by the current builder is
 * v3, and a v1-only walk (the original implementation) found zero
 * widgets on any real page — silently disabling the publish gate.
 */
function* walkWidgets(
  rows: PageRow[],
): Generator<{ id: string; type: string; data: any; stripTitle: string }> {
  for (const row of rows || []) {
    if (!row || typeof row !== "object") continue;

    // v1: no `columns` key — the row itself is the widget.
    if (!Array.isArray((row as any).columns)) {
      if (typeof row.type === "string") {
        yield {
          id: row.id,
          type: row.type,
          data: row.content,
          stripTitle: row.strip_title || "",
        };
      }
      continue;
    }

    // v2 / v3: widgets are nested; `type` and field data live on the
    // widget, not the row.
    for (const col of (row as any).columns || []) {
      const widgetLists: any[][] = Array.isArray(col?.cells)
        ? col.cells.map((cell: any) => cell?.widgets || [])
        : Array.isArray(col?.widgets)
          ? [col.widgets]
          : [];
      for (const widgets of widgetLists) {
        for (const w of widgets || []) {
          if (typeof w?.type === "string") {
            yield {
              id: w.id || row.id,
              type: w.type,
              data: w.data || w.content,
              stripTitle: (row as any).strip_title || "",
            };
          }
        }
      }
    }
  }
}

/**
 * Walk a page's rows and return an entry per image that has a URL but
 * no alt text. Empty array means the page is publishable.
 */
export const findMissingAltViolations = (rows: PageRow[]): AccessibilityViolation[] => {
  const violations: AccessibilityViolation[] = [];

  for (const widget of walkWidgets(rows)) {
    const fields = IMAGE_FIELDS_BY_TYPE[widget.type as PageRow["type"]];
    if (!fields) continue;

    for (const field of fields) {
      const url = getPath(widget.data, field.urlPath);
      if (typeof url !== "string" || url.trim().length === 0) continue; // no image, nothing to validate
      const alt = getPath(widget.data, field.altPath);
      if (isMissingAlt(alt)) {
        violations.push({
          rowId: widget.id,
          rowType: widget.type as PageRow["type"],
          label: field.label,
          stripTitle: widget.stripTitle || field.label,
        });
      }
    }
  }

  return violations;
};

/**
 * Convenience formatter for the toast message specified in the story.
 * Returns `null` when there are no violations.
 */
export const formatAltMissingMessage = (
  violations: AccessibilityViolation[],
): string | null => {
  if (violations.length === 0) return null;
  const n = violations.length;
  return `Cannot publish: ${n} image${n === 1 ? "" : "s"} missing accessibility text.`;
};
