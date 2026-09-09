/**
 * AdminStickyBar — the save bar of an editing screen.
 *
 * A small centred bar fixed to the bottom of the window: status on the
 * left, the buttons on the right, never more than 560px wide, so one
 * glance covers both. Screens that use it add `admin-savebar-space`
 * below their last field so nothing hides behind it.
 */
import type { ReactNode } from "react";

interface Props {
  /** Status text, e.g. "Saving will publish this post." */
  status?: ReactNode;
  /** Show the unsaved dot next to the status. */
  dirty?: boolean;
  children: ReactNode;
}

const AdminStickyBar = ({ status, dirty, children }: Props) => (
  <>
    <div className="admin-savebar-space" aria-hidden />
    <div className="admin-savebar" role="region" aria-label="Save">
      <div className="admin-savebar-status">
        {dirty && <span className="admin-dot" style={{ background: "hsl(var(--admin-warn))" }} aria-hidden />}
        <span className="truncate">{status}</span>
      </div>
      <div className="admin-savebar-actions">{children}</div>
    </div>
  </>
);

export default AdminStickyBar;
