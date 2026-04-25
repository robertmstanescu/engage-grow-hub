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
 * Walk a page's rows and return an entry per image that has a URL but
 * no alt text. Empty array means the page is publishable.
 */
export const findMissingAltViolations = (rows: PageRow[]): AccessibilityViolation[] => {
  const violations: AccessibilityViolation[] = [];

  for (const row of rows || []) {
    const fields = IMAGE_FIELDS_BY_TYPE[row.type];
    if (!fields) continue;

    for (const field of fields) {
      const url = getPath(row.content, field.urlPath);
      if (typeof url !== "string" || url.trim().length === 0) continue; // no image, nothing to validate
      const alt = getPath(row.content, field.altPath);
      if (isMissingAlt(alt)) {
        violations.push({
          rowId: row.id,
          rowType: row.type,
          label: field.label,
          stripTitle: row.strip_title || field.label,
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
