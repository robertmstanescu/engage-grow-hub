import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { PageRow } from "@/types/rows";

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
  /**
   * EPIC 1 / US 1.4 — Direct Canvas Editing
   * Commit a text/html value back to the page-rows tree at the given
   * NodePath. The provider walks the path to update the right field
   * inside the right row's content / columns_data and calls the
   * upstream `onRowsChange` callback.
   *
   * Returns true on success, false if the path doesn't resolve to a
   * known field (in which case callers can fall back to the inspector).
   */
  commitTextAtPath: (path: NodePath, value: string, html?: boolean) => boolean;
  /**
   * EPIC 1 / US 1.5 — Breadcrumb Navigation
   * Read-only access to the rows tree so the breadcrumb can resolve
   * human-readable labels (row type, widget kind, item title, etc.)
   * for each segment of the active path. May be undefined when the
   * provider was mounted without rows (older callers).
   */
  pageRows?: PageRow[];
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
  commitTextAtPath: () => false,
  pageRows: undefined,
};

const BuilderContext = createContext<BuilderContextValue>(DISABLED);

/**
 * Provider — mount once around the admin canvas. Anything outside this
 * provider gets the DISABLED stub and behaves like the public site.
 *
 * EPIC 1 / US 1.4 — Direct Canvas Editing:
 *   The provider can optionally receive `pageRows` + `onRowsChange`.
 *   When supplied, `commitTextAtPath` will walk the path and write the
 *   new value back into the rows tree. We hold these in refs so the
 *   commit callback stays stable across renders (preventing
 *   contentEditable from re-mounting and losing caret position).
 */
interface BuilderProviderProps {
  children: ReactNode;
  pageRows?: PageRow[];
  onRowsChange?: (rows: PageRow[]) => void;
}

/**
 * Resolve the leaf field at the end of a NodePath inside the rows tree
 * and write `value` to it. Returns true when the path was understood.
 *
 * Supported path shapes (covers the v3 schema atoms used by TextRow,
 * ServiceRow, HeroRow, etc.):
 *
 *   ["row", rowId, "widget", rowId, "col", colIndex, "<field>"]
 *      → row.content[<field>] (col 0) or row.columns_data[col-1][<field>] (col >0)
 *
 *   ["row", rowId, "widget", rowId, "item", itemId, "<field>"]
 *      → finds the item by id inside row.content.{services|items|features|...}
 *
 *   ["row", rowId, "widget", rowId, "<field>"]
 *      → row.content[<field>]
 *
 * Special handling: a `title` leaf maps to `title_lines` (string[]) by
 * splitting the incoming text on newlines. This keeps multi-line titles
 * round-trippable.
 */
const writeRowsAtPath = (
  rows: PageRow[],
  path: NodePath,
  value: string,
): { rows: PageRow[]; ok: boolean } => {
  if (path.length < 3 || path[0] !== "row") return { rows, ok: false };
  const rowId = path[1];
  const rowIdx = rows.findIndex((r) => r.id === rowId);
  if (rowIdx === -1) return { rows, ok: false };

  // Strip leading ["row", rowId] then optional ["widget", rowId].
  let rest = path.slice(2);
  if (rest[0] === "widget" && rest[1] === rowId) rest = rest.slice(2);
  if (rest.length === 0) return { rows, ok: false };

  const row = rows[rowIdx];
  const setLeafOnObject = (obj: Record<string, any>, leaf: string, v: string) => {
    if (leaf === "title") {
      const lines = v.split(/\n+/).map((s) => s.trim()).filter(Boolean);
      return { ...obj, title_lines: lines.length > 0 ? lines : [v] };
    }
    return { ...obj, [leaf]: v };
  };

  // Column path: ["col", colIndex, leaf]
  if (rest[0] === "col" && rest.length >= 3) {
    const colIndex = Number(rest[1]);
    const leaf = rest[rest.length - 1];
    if (Number.isNaN(colIndex)) return { rows, ok: false };
    if (colIndex === 0) {
      const nextContent = setLeafOnObject(row.content || {}, leaf, value);
      const nextRows = rows.slice();
      nextRows[rowIdx] = { ...row, content: nextContent };
      return { rows: nextRows, ok: true };
    }
    const cdIdx = colIndex - 1;
    const cd = (row.columns_data || []).slice();
    cd[cdIdx] = setLeafOnObject(cd[cdIdx] || {}, leaf, value);
    const nextRows = rows.slice();
    nextRows[rowIdx] = { ...row, columns_data: cd };
    return { rows: nextRows, ok: true };
  }

  // Item path: ["item", itemId, leaf]
  if (rest[0] === "item" && rest.length >= 3) {
    const itemId = rest[1];
    const leaf = rest[rest.length - 1];
    const content = { ...(row.content || {}) } as Record<string, any>;
    let mutated = false;
    for (const collectionKey of ["services", "items", "features", "pillars", "cards", "logos"]) {
      const list = content[collectionKey];
      if (Array.isArray(list)) {
        const idx = list.findIndex((it: any) => it && it.id === itemId);
        if (idx !== -1) {
          const nextList = list.slice();
          nextList[idx] = setLeafOnObject(list[idx] || {}, leaf, value);
          content[collectionKey] = nextList;
          mutated = true;
          break;
        }
      }
    }
    if (!mutated) return { rows, ok: false };
    const nextRows = rows.slice();
    nextRows[rowIdx] = { ...row, content };
    return { rows: nextRows, ok: true };
  }

  // Legacy ServiceRow shape: ["field", leaf] → row.content[leaf].
  if (rest[0] === "field" && rest.length >= 2) {
    const leaf = rest[rest.length - 1];
    const nextContent = setLeafOnObject(row.content || {}, leaf, value);
    const nextRows = rows.slice();
    nextRows[rowIdx] = { ...row, content: nextContent };
    return { rows: nextRows, ok: true };
  }

  // Bare ["<field>"] on the row content.
  if (rest.length === 1) {
    const leaf = rest[0];
    const nextContent = setLeafOnObject(row.content || {}, leaf, value);
    const nextRows = rows.slice();
    nextRows[rowIdx] = { ...row, content: nextContent };
    return { rows: nextRows, ok: true };
  }

  return { rows, ok: false };
};

export const BuilderProvider = ({ children, pageRows, onRowsChange }: BuilderProviderProps) => {
  const [activeNodePath, setActiveNodePathState] = useState<NodePath | null>(null);
  const [editingPath, setEditingPathState] = useState<NodePath | null>(null);

  // Hold the rows + setter in refs so commitTextAtPath stays referentially
  // stable. contentEditable is fragile w.r.t. parent re-renders (caret
  // jumping); a stable callback minimizes that.
  const rowsRef = useRef<PageRow[] | undefined>(pageRows);
  rowsRef.current = pageRows;
  const onRowsChangeRef = useRef<typeof onRowsChange>(onRowsChange);
  onRowsChangeRef.current = onRowsChange;

  const setActiveNodePath = useCallback((path: NodePath | null) => {
    setActiveNodePathState(path);
    setEditingPathState((prev) => (prev && pathsEqual(prev, path) ? prev : null));
  }, []);

  const setEditingPath = useCallback((path: NodePath | null) => {
    setEditingPathState(path);
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

  const commitTextAtPath = useCallback(
    (path: NodePath, value: string): boolean => {
      const rows = rowsRef.current;
      const setter = onRowsChangeRef.current;
      if (!rows || !setter) return false;
      const { rows: next, ok } = writeRowsAtPath(rows, path, value);
      if (ok) setter(next);
      return ok;
    },
    [],
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
      commitTextAtPath,
    }),
    [
      activeNodePath,
      setActiveNodePath,
      editingPath,
      setEditingPath,
      isPathActive,
      isPathEditing,
      setActiveElement,
      commitTextAtPath,
    ],
  );

  return <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>;
};

/** Read the current builder state. Always safe — returns a stub on the public site. */
export const useBuilder = (): BuilderContextValue => useContext(BuilderContext);

/** Exported for tests / advanced consumers. */
export { pathsEqual, isPathPrefix, legacyIdToPath, pathToLegacyId };
