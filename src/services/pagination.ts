/**
 * Shared pagination helpers for the `.range()`-based list functions in
 * services/*.ts.
 */

export const DEFAULT_PAGE_SIZE = 50;

export const pageRange = (page: number, pageSize: number): [number, number] => {
  const from = (page - 1) * pageSize;
  return [from, from + pageSize - 1];
};

/**
 * Pages through a `.range()`-based list function to collect every row.
 * For admin views that audit/aggregate across an entire table (SEO audit,
 * insights dashboards) where a single bounded page isn't enough, but an
 * unbounded `select *` is still the thing we're trying to avoid.
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number, pageSize: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<{ data: T[]; error: unknown }> {
  const all: T[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await fetchPage(page, pageSize);
    if (error) return { data: all, error };
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
  }
  return { data: all, error: null };
}
