import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * useListFilters — the single source of truth for "search + filter + sort"
 * across every list view in the Admin Panel.
 *
 * ════════════════════════════════════════════════════════════════════
 * JUNIOR-DEV LESSON: CLIENT-SIDE vs SERVER-SIDE FILTERING
 * ════════════════════════════════════════════════════════════════════
 *
 * Filtering can happen in two places:
 *
 *   1) SERVER-SIDE — every keystroke triggers a SQL query like
 *      `SELECT … WHERE title ILIKE '%abc%'`. The DB does the work,
 *      the network is hit on every change.
 *
 *   2) CLIENT-SIDE — we fetch the full list ONCE, hold it in React
 *      state, and recompute the filtered view in the browser as the
 *      user types. Zero extra network requests.
 *
 * For the admin panel, every list (rows, blog, pages, contacts, etc.)
 * is small enough to live in memory — typically < a few hundred items.
 * That makes CLIENT-SIDE filtering the right call:
 *
 *   ✅  Instant feedback (no round-trip)
 *   ✅  Works offline once loaded
 *   ✅  Simple — no extra Supabase RPC calls or pagination cursors
 *   ⚠️  Doesn't scale to 10k+ rows. If we ever ship that, we'd swap
 *      the in-memory filter for a debounced query against Postgres
 *      full-text search and add server-side pagination.
 *
 * ════════════════════════════════════════════════════════════════════
 * WHY DEBOUNCE THE SEARCH INPUT
 * ════════════════════════════════════════════════════════════════════
 *
 * Even though the work is local, recomputing on every keystroke can be
 * expensive when:
 *   • the predicate touches large strings (e.g. row body HTML), or
 *   • the list is rendered with heavy children (images, inline editors).
 *
 * `activeSearchQuery` lags behind the input by `debounceMs` (default
 * 200ms). Typing "service" produces ONE filtered render after the user
 * pauses, not seven separate renders. The visible input value
 * (`searchInput`) updates instantly so the user never feels the delay.
 *
 * ════════════════════════════════════════════════════════════════════
 * URL PERSISTENCE
 * ════════════════════════════════════════════════════════════════════
 *
 * State is mirrored into the URL query string (?q=&type=&sort=) so:
 *   • Reloading the page keeps the filter active.
 *   • Sharing a link with a teammate ("here's the broken row I found")
 *     reproduces the same filtered view.
 *   • Browser back/forward steps through filter history naturally.
 *
 * Each list passes a unique `paramPrefix` so multiple filtered tabs in
 * the same SPA don't collide on the same `?q=` key.
 */

export type SortMode = "manual" | "updated" | "alpha" | "score";

interface UseListFiltersOptions<T> {
  /** Source array (already fetched). Filtering runs in-memory over this. */
  items: T[];
  /**
   * Build the searchable haystack for one item. Keep it lowercase &
   * pre-trimmed for fast `includes()` matching. Concatenate every
   * field the user might want to type (title, type, slug, …).
   */
  searchableText: (item: T) => string;
  /**
   * Map an item to its category bucket (e.g. row.type, post.category,
   * page.status). Returning `null` excludes it from the type dropdown
   * but still lets it match search.
   */
  categoryOf?: (item: T) => string | null;
  /** Field to order by when sortMode === "alpha" (lowercased). */
  alphaKey?: (item: T) => string;
  /** Field to order by when sortMode === "updated" (Date or ISO string). */
  updatedKey?: (item: T) => string | Date | null | undefined;
  /**
   * Field to order by when sortMode === "score" — used by the CRM to
   * surface highest-intent leads first. Returning `null`/`undefined`
   * pushes the item to the bottom (unscored).
   */
  scoreKey?: (item: T) => number | null | undefined;
  /** Default sort mode. The user requested "manual" globally. */
  defaultSort?: SortMode;
  /**
   * URL param prefix so the same SPA can host multiple filtered lists
   * without `?q=` colliding (e.g. blog uses ?bq= ?bt= ?bs=).
   */
  paramPrefix?: string;
  /** Debounce delay for the search input (ms). Default 200ms. */
  debounceMs?: number;
}

export interface ListFiltersState {
  /** Live input value — bind directly to the search box. */
  searchInput: string;
  setSearchInput: (v: string) => void;
  /** Debounced query used for filtering. Read-only externally. */
  activeSearchQuery: string;
  /** Currently selected category. `"all"` means "no filter". */
  activeCategory: string;
  setActiveCategory: (v: string) => void;
  /** Available categories, in stable insertion order. */
  availableCategories: string[];
  /** Sort mode toggle. */
  sortMode: SortMode;
  setSortMode: (m: SortMode) => void;
  /** Reset everything to defaults (also clears URL params). */
  resetFilters: () => void;
  /** True when ANY filter/search/sort is active. */
  isFiltering: boolean;
}

/**
 * Returns both the controls (search/filter/sort state) AND the derived
 * `filteredItems` so the component never has to repeat the predicate.
 */
export function useListFilters<T>(opts: UseListFiltersOptions<T>): {
  state: ListFiltersState;
  filteredItems: T[];
} {
  const {
    items,
    searchableText,
    categoryOf,
    alphaKey,
    updatedKey,
    scoreKey,
    defaultSort = "manual",
    paramPrefix = "",
    debounceMs = 200,
  } = opts;

  const qKey = `${paramPrefix}q`;
  const tKey = `${paramPrefix}type`;
  const sKey = `${paramPrefix}sort`;

  const [searchParams, setSearchParams] = useSearchParams();

  // Initial values pulled from URL on mount; subsequent updates push back.
  const [searchInput, setSearchInputState] = useState(searchParams.get(qKey) ?? "");
  const [activeSearchQuery, setActiveSearchQuery] = useState(searchInput);
  const [activeCategory, setActiveCategoryState] = useState(searchParams.get(tKey) ?? "all");
  const [sortMode, setSortModeState] = useState<SortMode>(
    (searchParams.get(sKey) as SortMode) || defaultSort
  );

  /**
   * DEBOUNCE — see the file header for why. We wait `debounceMs` after
   * the LAST keystroke before promoting `searchInput` to
   * `activeSearchQuery`. That `activeSearchQuery` is the value that
   * actually drives the filter, so the heavy work runs at most once
   * per pause.
   */
  useEffect(() => {
    const timer = setTimeout(() => setActiveSearchQuery(searchInput.trim().toLowerCase()), debounceMs);
    return () => clearTimeout(timer);
  }, [searchInput, debounceMs]);

  /**
   * Mirror state → URL whenever any filter changes. We use
   * `replace: true` so each keystroke does NOT pollute the back-button
   * history with hundreds of intermediate states.
   */
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (activeSearchQuery) next.set(qKey, activeSearchQuery); else next.delete(qKey);
    if (activeCategory && activeCategory !== "all") next.set(tKey, activeCategory); else next.delete(tKey);
    if (sortMode && sortMode !== defaultSort) next.set(sKey, sortMode); else next.delete(sKey);

    // Only call setSearchParams if the string actually changed — avoids
    // an infinite loop with React Router's internal subscription.
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // We intentionally leave searchParams out of the dep array; we only
    // want to PUSH our state, never react to URL changes mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSearchQuery, activeCategory, sortMode]);

  const setSearchInput = useCallback((v: string) => setSearchInputState(v), []);
  const setActiveCategory = useCallback((v: string) => setActiveCategoryState(v), []);
  const setSortMode = useCallback((m: SortMode) => setSortModeState(m), []);

  const resetFilters = useCallback(() => {
    setSearchInputState("");
    setActiveSearchQuery("");
    setActiveCategoryState("all");
    setSortModeState(defaultSort);
  }, [defaultSort]);

  /**
   * Derive the dropdown options from the current items. We sort
   * alphabetically so the order is stable across reloads and doesn't
   * depend on which row was created first.
   */
  const availableCategories = useMemo(() => {
    if (!categoryOf) return [];
    const seen = new Set<string>();
    for (const item of items) {
      const c = categoryOf(item);
      if (c) seen.add(c);
    }
    return Array.from(seen).sort();
  }, [items, categoryOf]);

  /**
   * THE FILTER PIPELINE
   * ───────────────────
   * 1) Narrow by `activeCategory` (cheap exact match).
   * 2) Narrow by `activeSearchQuery` against the haystack string.
   * 3) Sort the survivors by the chosen mode.
   *
   * Each stage operates on the OUTPUT of the previous one, so we never
   * do unnecessary work — e.g. if the category filter eliminates 90%
   * of items, the search predicate only runs on the remaining 10%.
   *
   * The variable name `filteredItems` is descriptive and matches the
   * convention used in junior-dev tutorials (vs the cryptic `result`).
   */
  const filteredItems = useMemo(() => {
    let filteredItems = items;

    if (categoryOf && activeCategory !== "all") {
      filteredItems = filteredItems.filter((item) => categoryOf(item) === activeCategory);
    }

    if (activeSearchQuery) {
      filteredItems = filteredItems.filter((item) =>
        searchableText(item).includes(activeSearchQuery)
      );
    }

    if (sortMode === "alpha" && alphaKey) {
      // Spread first — Array.prototype.sort mutates in place and would
      // corrupt the parent state that the items array points to.
      filteredItems = [...filteredItems].sort((a, b) =>
        alphaKey(a).localeCompare(alphaKey(b))
      );
    } else if (sortMode === "updated" && updatedKey) {
      filteredItems = [...filteredItems].sort((a, b) => {
        const ta = new Date(updatedKey(a) ?? 0).getTime();
        const tb = new Date(updatedKey(b) ?? 0).getTime();
        return tb - ta; // newest first
      });
    } else if (sortMode === "score" && scoreKey) {
      // Highest intent first. Unscored leads (null/undefined) sink to
      // the bottom — a -1 sentinel keeps them out of the Hot/Warm zone
      // without breaking the comparator.
      filteredItems = [...filteredItems].sort((a, b) => {
        const sa = scoreKey(a) ?? -1;
        const sb = scoreKey(b) ?? -1;
        return sb - sa;
      });
    }
    // sortMode === "manual" → preserve incoming order (page sequence,
    // user drag order, server default). Do nothing.

    return filteredItems;
  }, [items, activeCategory, activeSearchQuery, sortMode, categoryOf, searchableText, alphaKey, updatedKey, scoreKey]);

  const isFiltering =
    Boolean(activeSearchQuery) || activeCategory !== "all" || sortMode !== defaultSort;

  return {
    state: {
      searchInput,
      setSearchInput,
      activeSearchQuery,
      activeCategory,
      setActiveCategory,
      availableCategories,
      sortMode,
      setSortMode,
      resetFilters,
      isFiltering,
    },
    filteredItems,
  };
}
