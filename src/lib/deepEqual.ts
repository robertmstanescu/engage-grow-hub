/**
 * deepEqual — structural equality for JSON-like values (objects, arrays,
 * primitives).
 *
 * WHY THIS EXISTS
 * ───────────────
 * `JSON.stringify(a) !== JSON.stringify(b)` is a common shortcut for "did
 * this change", but it's order-sensitive: two objects holding the exact
 * same data report as "different" if their keys happen to be in a
 * different order. That's a real risk for anything that round-trips
 * through a database — Postgres JSONB does not guarantee preserving the
 * exact key order an application originally wrote, especially once a
 * value has been read, rebuilt in JS (e.g. by a migration/normalisation
 * step), and written back. Admin editors comparing a draft blob against
 * its published counterpart hit this class of bug as false "unsaved
 * changes" prompts with no real edit behind them.
 *
 * Object keys are compared order-independently; array order DOES matter
 * (row order, list order) and is compared positionally, as expected.
 */
export const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== "object") return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(
    (key) => Object.prototype.hasOwnProperty.call(bObj, key) && deepEqual(aObj[key], bObj[key]),
  );
};
