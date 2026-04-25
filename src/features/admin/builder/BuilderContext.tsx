import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * ════════════════════════════════════════════════════════════════════
 * BuilderContext — selection state for the visual canvas
 * ════════════════════════════════════════════════════════════════════
 *
 * EPIC 1 / US 1.1 — Atomic Canvas:
 *   Selection is no longer a single opaque string id; it's a PATH into
 *   the page tree. A path looks like:
 *
 *     ['row', 'row_abc']                              → the row itself
 *     ['row', 'row_abc', 'widget', 'service']         → the widget block
 *     ['row', 'row_abc', 'widget', 'service',
 *      'item', 'svc_xyz', 'eyebrow']                  → an atomic node
 *
 *   The path lets the inspector know EXACTLY which DOM node the editor
 *   targeted (a row vs a widget vs a single subtitle).
 *
 * BACKWARDS COMPAT
 * ────────────────
 *   The previous API exposed `activeElement: string` (e.g. `widget:row_x`
 *   or `hero`). Several editors still rely on that shape. We keep both
 *   surfaces so existing call-sites work unchanged:
 *
 *     • `activeElement`     — joined "kind:id" of the FIRST 1-2 segments
 *                             of the active path (so `widget:row_x`
 *                             stays equivalent to `['row','row_x',
 *                             'widget','row_x']`).
 *     • `setActiveElement`  — accepts the legacy `kind:id` string and
 *                             converts it to a path.
 *     • `activeNodePath`    — NEW: the full path array.
 *     • `setActiveNodePath` — NEW: replace the path directly.
 *     • `editingPath`       — NEW: the path currently in INLINE EDIT
 *                             mode (set by double-click). null = no
 *                             inline edit, only selection.
 *
 * IMPORTANT — `enabled` flag:
 *   The same RowsRenderer is used by the public site. Wrapping every
 *   row with selection chrome on the public site would be a disaster.
 *   So the Provider only emits a non-null context value when `enabled`
 *   is true (i.e. inside the admin canvas). On the public site there
 *   is NO provider above the tree, and `useBuilder()` returns a
 *   `disabled` stub that makes <SelectableWrapper> render as a
 *   transparent <> passthrough — zero DOM noise, zero perf cost.
 */

export type NodePath = string[];

const pathsEqual = (a: NodePath | null, b: NodePath | null) => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

const isPathPrefix = (prefix: NodePath, full: NodePath) => {
  if (prefix.length > full.length) return false;
  for (let i = 0; i < prefix.length; i++) if (prefix[i] !== full[i]) return false;
  return true;
};

/**
 * Convert a legacy "kind:id" string into a path array.
 * "hero"                       → ["hero"]
 * "row:row_x"                  → ["row","row_x"]
 * "widget:row_x"               → ["row","row_x","widget","row_x"]
 * "cell:row_x:col_y:cell_z"    → ["row","row_x","col","col_y","cell","cell_z"]
 *
 * The `widget:` shorthand expands to a row+widget pair; the `cell:`
 * shorthand expands to the full row→col→cell triple. Both let callers
 * round-trip selection state without losing context.
 */
const legacyIdToPath = (id: string): NodePath => {
  if (!id) return [];
  if (!id.includes(":")) return [id];
  const [kind, ...rest] = id.split(":");
  if (kind === "row") return ["row", ...rest];
  if (kind === "widget") {
    const [rowId, ...trailing] = rest;
    return ["row", rowId, "widget", rowId, ...trailing];
  }
  if (kind === "cell" && rest.length >= 3) {
    const [rowId, colId, cellId, ...trailing] = rest;
    return ["row", rowId, "col", colId, "cell", cellId, ...trailing];
  }
  return [kind, ...rest];
};

/**
 * Convert a path back into a legacy "kind:id" string for components
 * that haven't been migrated yet (InspectorPanel, etc.).
 *
 *   ["hero"]                                      → "hero"
 *   ["row","row_x"]                               → "row:row_x"
 *   ["row","row_x","widget","row_x"]              → "widget:row_x"
 *   ["row","row_x","col","col_y","cell","cell_z"] → "cell:row_x:col_y:cell_z"
 *   ["row","row_x","widget","row_x","item",
 *    "svc_y","eyebrow"]                           → "widget:row_x"  (selection
 *                                                       collapses to widget level
 *                                                       for legacy reads; the
 *                                                       full path is still
 *                                                       available via
 *                                                       activeNodePath)
 */
const pathToLegacyId = (path: NodePath | null): string | null => {
  if (!path || path.length === 0) return null;
  if (path.length === 1) return path[0];
  if (path[0] === "row" && path.length >= 6 && path[2] === "col" && path[4] === "cell") {
    return `cell:${path[1]}:${path[3]}:${path[5]}`;
  }
  if (path[0] === "row" && path.length >= 4 && path[2] === "widget") {
    return `widget:${path[1]}`;
  }
  if (path[0] === "row") return `row:${path[1]}`;
  return path.join(":");
};

export interface BuilderContextValue {
  /** Whether selection chrome should be applied at all. */
  enabled: boolean;
  /** Currently selected path, or null. (NEW) */
  activeNodePath: NodePath | null;
  /** Replace the active path directly. (NEW) */
  setActiveNodePath: (path: NodePath | null) => void;
  /** Path currently in INLINE EDIT mode (double-click). (NEW) */
  editingPath: NodePath | null;
  /** Enter / leave inline edit mode for a path. */
  setEditingPath: (path: NodePath | null) => void;
  /** Helpers for SelectableWrapper. */
  isPathActive: (path: NodePath) => boolean;
  isPathEditing: (path: NodePath) => boolean;
  /** LEGACY — derived `kind:id` string. */
  activeElement: string | null;
  /** LEGACY — accepts `kind:id` strings, expands to a path. */
  setActiveElement: (id: string | null) => void;
}

const DISABLED: BuilderContextValue = {
  enabled: false,
  activeNodePath: null,
  setActiveNodePath: () => {},
  editingPath: null,
  setEditingPath: () => {},
  isPathActive: () => false,
  isPathEditing: () => false,
  activeElement: null,
  setActiveElement: () => {},
};

const BuilderContext = createContext<BuilderContextValue>(DISABLED);

/**
 * Provider — mount once around the admin canvas. Anything outside this
 * provider gets the DISABLED stub and behaves like the public site.
 */
export const BuilderProvider = ({ children }: { children: ReactNode }) => {
  const [activeNodePath, setActiveNodePathState] = useState<NodePath | null>(null);
  const [editingPath, setEditingPathState] = useState<NodePath | null>(null);

  const setActiveNodePath = useCallback((path: NodePath | null) => {
    setActiveNodePathState(path);
    // Selecting a different node always exits inline edit mode.
    setEditingPathState((prev) => (prev && pathsEqual(prev, path) ? prev : null));
  }, []);

  const setEditingPath = useCallback((path: NodePath | null) => {
    setEditingPathState(path);
    // Entering edit also makes the path the active selection.
    if (path) setActiveNodePathState(path);
  }, []);

  const setActiveElement = useCallback((id: string | null) => {
    if (!id) {
      setActiveNodePathState(null);
      setEditingPathState(null);
      return;
    }
    setActiveNodePathState(legacyIdToPath(id));
    setEditingPathState(null);
  }, []);

  const isPathActive = useCallback(
    (path: NodePath) => pathsEqual(activeNodePath, path),
    [activeNodePath],
  );
  const isPathEditing = useCallback(
    (path: NodePath) => pathsEqual(editingPath, path),
    [editingPath],
  );

  const value = useMemo<BuilderContextValue>(
    () => ({
      enabled: true,
      activeNodePath,
      setActiveNodePath,
      editingPath,
      setEditingPath,
      isPathActive,
      isPathEditing,
      activeElement: pathToLegacyId(activeNodePath),
      setActiveElement,
    }),
    [
      activeNodePath,
      setActiveNodePath,
      editingPath,
      setEditingPath,
      isPathActive,
      isPathEditing,
      setActiveElement,
    ],
  );

  return <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>;
};

/** Read the current builder state. Always safe — returns a stub on the public site. */
export const useBuilder = (): BuilderContextValue => useContext(BuilderContext);

/** Exported for tests / advanced consumers. */
export { pathsEqual, isPathPrefix, legacyIdToPath, pathToLegacyId };
