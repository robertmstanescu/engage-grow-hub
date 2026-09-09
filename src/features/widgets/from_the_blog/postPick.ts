/**
 * postPick — which posts a "From the blog" row shows.
 *
 * Posts in the chosen categories come first (newest first, as fetched);
 * if there are not enough, the newest other posts fill the row. No
 * categories chosen means simply the newest posts. The link under the
 * row points at the blog filtered by the first chosen category when at
 * least one post matched, otherwise at the whole blog.
 */
export interface PostLite {
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  cover_image_alt: string | null;
  published_at: string | null;
  category: string | null;
}

export const pickPosts = <T extends { category: string | null }>(posts: T[], categories: string[], limit: number): T[] => {
  const wanted = categories.map((c) => c.trim()).filter(Boolean);
  const same = wanted.length ? posts.filter((p) => p.category && wanted.includes(p.category)) : [];
  const rest = posts.filter((p) => !same.includes(p));
  return [...same, ...rest].slice(0, Math.max(0, limit));
};

export const blogLinkFor = (picked: Array<{ category: string | null }>, categories: string[]): string => {
  const wanted = categories.map((c) => c.trim()).filter(Boolean);
  const matched = picked.find((p) => p.category && wanted.includes(p.category));
  return matched?.category ? `/blog/?category=${encodeURIComponent(matched.category)}` : "/blog/";
};
