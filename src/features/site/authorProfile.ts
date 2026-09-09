/**
 * authorProfile — who wrote the blog, said once.
 *
 * The author block under an article used to be assembled from two
 * places: the name and photo were typed into every post, while the
 * LinkedIn link came from the Profile screen. So the same person was
 * re-entered on every post and the two could drift apart.
 *
 * Now the whole author lives in site content under `author_profile`
 * (publicly readable — `profiles` is readable by signed-in users only,
 * so it cannot carry anything the public site has to render). A post's
 * own `author_name` / `author_image` columns stay as the fallback, so
 * everything written before this change keeps the author it shipped
 * with until the Profile screen is filled in.
 */

export interface AuthorProfile {
  name?: string;
  photo?: string;
  photo_alt?: string;
  linkedin?: string;
}

/** What a post stores about its author (the pre-`author_profile` shape). */
export interface PostAuthorFallback {
  author_name?: string | null;
  author_image?: string | null;
  author_image_alt?: string | null;
}

export interface ResolvedAuthor {
  name: string;
  photo: string;
  photoAlt: string;
}

const clean = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/**
 * The author to show for one post: the site's author profile, falling
 * back field by field to whatever that post stored. Field by field and
 * not all-or-nothing, so a profile with a name but no photo still uses
 * the post's photo rather than dropping it.
 */
export const resolveAuthor = (
  profile: AuthorProfile | null | undefined,
  post: PostAuthorFallback | null | undefined,
): ResolvedAuthor => {
  const name = clean(profile?.name) || clean(post?.author_name);
  const photo = clean(profile?.photo) || clean(post?.author_image);
  const photoAlt = clean(profile?.photo) ? clean(profile?.photo_alt) : clean(post?.author_image_alt);
  return { name, photo, photoAlt: photoAlt || name };
};
