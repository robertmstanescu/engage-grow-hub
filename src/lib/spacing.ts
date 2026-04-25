/**
 * ════════════════════════════════════════════════════════════════════
 * spacing.ts — User Story 2.4 (The Absolute Pixel Enforcement Engine)
 * ════════════════════════════════════════════════════════════════════
 *
 * Single source of truth for converting user-defined spacing values
 * into CSS strings. The page builder lets admins type bare numbers
 * (e.g. `20`) into the Inspector — this util guarantees those numbers
 * surface in the DOM as **explicit `px` strings** ("20px"), never as
 * unitless React shorthand (which works in browsers but is ambiguous
 * in serialised CSS) and never as Tailwind classes (which scale via
 * `rem` and the root font-size, muddying pixel-perfect designs).
 *
 * WHY a string instead of returning a number:
 *   React's CSSProperties accepts a number and *implicitly* converts
 *   it to `px`. That's convenient but it tucks the unit away from the
 *   developer, which makes it easy to mistakenly mix in `rem` values
 *   later and silently break pixel-perfect targeting. By forcing a
 *   string "<n>px" everywhere, the inline style is unambiguous and
 *   our QA checks ("the button moves 40px") can be verified by reading
 *   the rendered DOM.
 *
 * Acceptable inputs (intentionally lenient — the Inspector clamps
 * before this is called, but fields, JSON imports, and migrations may
 * not):
 *   • `42`           → "42px"
 *   • `"42"`         → "42px"
 *   • `"42px"`       → "42px" (idempotent)
 *   • `"42rem"`      → "42rem" (preserve explicit non-px units —
 *                                  the user opted in by typing them)
 *   • `null/undef`   → `undefined` (let the consumer omit the rule)
 *   • `NaN/""/junk`  → `undefined`
 */

/** Strict numeric parse that rejects `NaN` and infinity. */
const toFiniteNumber = (raw: unknown): number | null => {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed === "") return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

/**
 * Convert a user-defined spacing value into a CSS-ready string.
 *
 * Returns `undefined` for nullish / unparseable input so callers can
 * spread the result into a `style={{}}` object without producing the
 * literal string "undefined" or accidentally setting `padding: NaN`.
 */
export const parseSpacing = (val: unknown): string | undefined => {
  if (val === null || val === undefined) return undefined;

  // Honour explicit non-px CSS units the admin has typed themselves
  // (rem / em / % / vh / vw / ch). The Inspector itself never produces
  // these, but page-revisions and JSON imports may. Stripping them
  // would silently rewrite the design.
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed === "") return undefined;
    if (/^-?\d*\.?\d+(px|rem|em|%|vh|vw|ch)$/i.test(trimmed)) {
      // Already valid CSS — pass through unchanged so idempotency holds.
      return trimmed;
    }
  }

  const n = toFiniteNumber(val);
  if (n === null) return undefined;
  return `${n}px`;
};

/**
 * Convenience helper — convert a TRBL bag of user-defined values into
 * a partial CSSProperties object using `parseSpacing` on each side.
 * Undefined sides are omitted so they fall through to the cascade.
 */
export const spacingBoxToStyle = (box: {
  top?: unknown;
  right?: unknown;
  bottom?: unknown;
  left?: unknown;
}): {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
} => {
  const out: { top?: string; right?: string; bottom?: string; left?: string } = {};
  const t = parseSpacing(box.top);
  const r = parseSpacing(box.right);
  const b = parseSpacing(box.bottom);
  const l = parseSpacing(box.left);
  if (t !== undefined) out.top = t;
  if (r !== undefined) out.right = r;
  if (b !== undefined) out.bottom = b;
  if (l !== undefined) out.left = l;
  return out;
};
