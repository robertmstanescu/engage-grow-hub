import { Search, X, ArrowDownAZ, Clock, ListOrdered, Flame } from "lucide-react";
import type { ListFiltersState, SortMode } from "@/hooks/useListFilters";

/**
 * <ListFilters/> — the search + type filter + sort toolbar that sits
 * above every list view in the Admin Panel.
 *
 * ## Why a shared component
 * Before this, each list (rows, blog, pages, contacts, …) would have
 * built its own search bar with slightly different padding, focus
 * rings, debounce wiring, etc. — exactly the drift problem we
 * established with `<RowSection/>` for the marketing site.
 *
 * One `<ListFilters/>` here means: tweak the input height once, every
 * admin list gets the new height. No drift, ever.
 *
 * ## Design choices
 * - Matches the Admin Panel's existing input style (`hsl(var(--card))`
 *   bg, `hsl(var(--border))` border, `font-body text-sm`).
 * - Type dropdown is rendered ONLY when the parent provides a non-empty
 *   `availableCategories` array. Lists without a meaningful type axis
 *   (e.g. Contacts) just don't pass `categoryOf` to the hook and the
 *   dropdown disappears.
 * - Sort toggle uses three small icon buttons rather than a dropdown —
 *   the user picked "manual" as default; a single click switches mode.
 * - "Clear" appears only while `isFiltering`. Less chrome when idle.
 */

interface Props {
  state: ListFiltersState;
  /** Placeholder for the search input. Defaults to a generic label. */
  searchPlaceholder?: string;
  /** Hide the type dropdown (e.g. for lists that have no type axis). */
  showCategoryFilter?: boolean;
  /** Pretty-print a category value for the dropdown (e.g. "image_text" → "Image & Text"). */
  formatCategoryLabel?: (raw: string) => string;
  /** Hide individual sort buttons if a sort mode doesn't make sense for this list. */
  hideSortModes?: SortMode[];
}

const ListFilters = ({
  state,
  searchPlaceholder = "Search…",
  showCategoryFilter = true,
  formatCategoryLabel,
  hideSortModes = [],
}: Props) => {
  const {
    searchInput, setSearchInput,
    activeCategory, setActiveCategory, availableCategories,
    sortMode, setSortMode,
    resetFilters, isFiltering,
  } = state;

  const fmt = formatCategoryLabel ?? ((s: string) => s);
  const hasCategory = showCategoryFilter && availableCategories.length > 0;

  return (
    <div
      className="flex flex-wrap items-center gap-2 p-2 rounded-lg border"
      style={{
        backgroundColor: "hsl(var(--card))",
        borderColor: "hsl(var(--border) / 0.5)",
      }}
    >
      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <Search
          size={13}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "hsl(var(--muted-foreground))" }}
        />
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-8 pr-7 py-1.5 rounded-md font-body text-xs border outline-none transition-colors focus:border-[hsl(var(--primary)/0.5)]"
          style={{
            backgroundColor: "hsl(var(--background))",
            borderColor: "hsl(var(--border))",
            color: "hsl(var(--foreground))",
          }}
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => setSearchInput("")}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:opacity-70"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Category filter (only when the list has types) */}
      {hasCategory && (
        <select
          value={activeCategory}
          onChange={(e) => setActiveCategory(e.target.value)}
          className="px-2 py-1.5 rounded-md font-body text-xs border outline-none transition-colors focus:border-[hsl(var(--primary)/0.5)]"
          style={{
            backgroundColor: "hsl(var(--background))",
            borderColor: "hsl(var(--border))",
            color: "hsl(var(--foreground))",
          }}
        >
          <option value="all">All types</option>
          {availableCategories.map((cat) => (
            <option key={cat} value={cat}>{fmt(cat)}</option>
          ))}
        </select>
      )}

      {/* Sort */}
      <div
        className="flex items-center rounded-md border overflow-hidden"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        {!hideSortModes.includes("manual") && (
          <SortBtn active={sortMode === "manual"} onClick={() => setSortMode("manual")} title="Manual order">
            <ListOrdered size={12} />
          </SortBtn>
        )}
        {!hideSortModes.includes("updated") && (
          <SortBtn active={sortMode === "updated"} onClick={() => setSortMode("updated")} title="Last updated">
            <Clock size={12} />
          </SortBtn>
        )}
        {!hideSortModes.includes("alpha") && (
          <SortBtn active={sortMode === "alpha"} onClick={() => setSortMode("alpha")} title="Alphabetical">
            <ArrowDownAZ size={12} />
          </SortBtn>
        )}
        {!hideSortModes.includes("score") && (
          <SortBtn
            active={sortMode === "score"}
            onClick={() => setSortMode("score")}
            title="Highest intent / AI score"
          >
            <Flame size={12} />
          </SortBtn>
        )}
      </div>

      {/* Clear all */}
      {isFiltering && (
        <button
          type="button"
          onClick={resetFilters}
          className="font-body text-[10px] uppercase tracking-wider px-2 py-1 rounded hover:opacity-70"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          Clear
        </button>
      )}
    </div>
  );
};

const SortBtn = ({
  active, onClick, title, children,
}: {
  active: boolean; onClick: () => void; title: string; children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-pressed={active}
    className="px-2 py-1.5 transition-colors"
    style={{
      backgroundColor: active ? "hsl(var(--primary) / 0.12)" : "transparent",
      color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
    }}
  >
    {children}
  </button>
);

export default ListFilters;
