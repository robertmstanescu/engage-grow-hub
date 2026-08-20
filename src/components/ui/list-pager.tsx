/**
 * Minimal Prev/Next pager for server-paginated admin lists. Renders
 * nothing when everything fits on one page.
 */

interface ListPagerProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export const ListPager = ({ page, pageSize, total, onPageChange }: ListPagerProps) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between pt-2">
      <span className="font-body text-xs text-muted-foreground">
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="font-body text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-80 transition-opacity"
          style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}>
          Previous
        </button>
        <span className="font-body text-xs text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="font-body text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-80 transition-opacity"
          style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}>
          Next
        </button>
      </div>
    </div>
  );
};
