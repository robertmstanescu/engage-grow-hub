/**
 * ListSkeleton — placeholder rows shown during initial fetches.
 *
 * Why skeletons over spinners?
 *   - Spinners say "something is happening"
 *   - Skeletons say "something is happening AND it will look like THIS"
 *
 * The second message reduces perceived wait time because the user's eye
 * has already locked onto the layout.
 */

import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  /** How many placeholder rows to render. */
  rows?: number;
  /** Tailwind height class for each row. */
  rowHeight?: string;
  /** Outer wrapper class — defaults to `space-y-3`. */
  className?: string;
}

export const ListSkeleton = ({ rows = 4, rowHeight = "h-16", className = "space-y-3" }: Props) => (
  <div className={className} aria-busy="true" aria-label="Loading list">
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className={`w-full ${rowHeight} rounded-lg`} />
    ))}
  </div>
);
