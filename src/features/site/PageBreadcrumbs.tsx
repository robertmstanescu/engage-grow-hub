/**
 * PageBreadcrumbs — the visible "Home / Services / X" trail shown in
 * the footer of service, CMS and blog pages.
 *
 * Kept as a real, visible element (not just a JSON-LD block) on purpose:
 * Google's breadcrumb rich result is meant to reflect what a user
 * actually sees, and a visible trail gives visitors an obvious way back
 * up the site hierarchy too. `usePageMeta`'s matching `breadcrumbs` prop
 * emits the `BreadcrumbList` JSON-LD from the exact same data passed
 * here, so the two can never drift out of sync.
 */
import { Fragment } from "react";
import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export interface BreadcrumbEntry {
  name: string;
  /** Omit on the last (current) entry — it renders as plain text, not a link. */
  path?: string;
}

const PageBreadcrumbs = ({
  trail,
  placement = "page",
}: {
  trail: BreadcrumbEntry[];
  placement?: "page" | "footer";
}) => {
  // A single entry ("Home" alone) isn't a breadcrumb trail.
  if (trail.length < 2) return null;

  return (
    <div className={placement === "footer" ? "mb-8" : "row-container pt-24 md:pt-28"}>
      <Breadcrumb>
        <BreadcrumbList
          className={placement === "footer" ? "font-body text-micro gap-1.5 sm:gap-2" : undefined}
          style={placement === "footer" ? { color: "hsl(var(--foreground) / 0.5)", fontSize: "11px" } : undefined}
        >
          {trail.map((entry, i) => (
            <Fragment key={`${entry.name}-${i}`}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {entry.path ? (
                  <BreadcrumbLink asChild>
                    <Link className={placement === "footer" ? "hover:text-foreground" : undefined} to={entry.path}>{entry.name}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage
                    className={placement === "footer" ? "text-inherit" : undefined}
                  >
                    {entry.name}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};

export default PageBreadcrumbs;
