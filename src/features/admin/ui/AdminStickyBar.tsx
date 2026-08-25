/**
 * AdminStickyBar — the save/publish bar that stays reachable at the
 * bottom of an editing screen, so the actions you use constantly never
 * require scrolling to the end of a long form.
 */
import type { ReactNode } from "react";

interface Props {
  /** Left-hand status text, e.g. "Unsaved changes" / "Saved 2 min ago". */
  status?: ReactNode;
  /** Show the amber unsaved dot next to the status. */
  dirty?: boolean;
  children: ReactNode;
}

const AdminStickyBar = ({ status, dirty, children }: Props) => (
  <div className="sticky bottom-0 z-30 -mx-1 mt-2 border-t border-border bg-card/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/80">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 font-body text-xs text-muted-foreground">
        {dirty && <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />}
        {status}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  </div>
);

export default AdminStickyBar;
