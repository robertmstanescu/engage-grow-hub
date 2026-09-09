import { Link } from "react-router-dom";

/**
 * AllPostsButton — the pill that leads to the blog.
 *
 * One component so the "From the blog" row under a service page and the
 * "More to read" list beside an article offer the same button. It is
 * `btn-ink`, the site's one CTA pill — the same flat shape the contact
 * form, the hero and every row's call to action already use. No glass,
 * no glow, no bespoke type size.
 */
export const ALL_POSTS_LABEL = "All blogs & insights";

const AllPostsButton = ({ to = "/blog/", label = ALL_POSTS_LABEL }: { to?: string; label?: string }) => (
  <Link to={to} className="btn-ink shrink-0">
    {label}
  </Link>
);

export default AllPostsButton;
