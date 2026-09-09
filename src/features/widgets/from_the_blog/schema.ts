/**
 * From the blog — content schema.
 *
 * A row of recent posts, so a service page ends with the writing that
 * supports it. The row stores only what the owner decides; the posts
 * themselves come from `blog_posts` at render time.
 *
 * `zod/mini` because this schema ships in the PUBLIC bundle.
 */
import * as z from "zod/mini";

const str = (fallback = "") => z._default(z.string(), fallback);

export const fromTheBlogSchema = z.looseObject({
  /** Small label above the heading. */
  eyebrow: str(),
  /** The heading. */
  title: str("From the blog"),
  /** Post categories to show first; empty means the newest posts. */
  categories: z._default(z.array(z.string()), [] as string[]),
  /** How many posts: 3 or 6 (a full row or two). */
  limit: z._default(z.number(), 3),
  /** Text on the button that leads to the blog; empty hides it. */
  link_label: str("All blogs & insights"),
  color_eyebrow: str(),
  color_title: str(),
});

export type FromTheBlogContent = z.infer<typeof fromTheBlogSchema>;
export const FROM_THE_BLOG_DEFAULTS: FromTheBlogContent = fromTheBlogSchema.parse({});
