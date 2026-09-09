import { Link } from "react-router-dom";

/**
 * AllPostsButton — the pill that leads to the blog.
 *
 * One component so the "From the blog" row under a service page and the
 * "More to read" list beside an article offer the same button, in the
 * site's CTA shape (the same pill the call-to-action block uses).
 */
export const ALL_POSTS_LABEL = "All blogs & insights";

const AllPostsButton = ({ to = "/blog/", label = ALL_POSTS_LABEL }: { to?: string; label?: string }) => (
  <Link
    to={to}
    className="btn-glass interactive font-display text-[10px] uppercase tracking-[0.1em] font-bold px-5 py-2.5 rounded-full inline-block shrink-0"
    style={{ backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--primary-foreground))" }}
  >
    {label}
  </Link>
);

export default AllPostsButton;
