/**
 * Image alt-text helpers — keep frontend <img> tags accessible and SEO-friendly
 * without scattering fallback logic across components.
 */

/**
 * Resolve the alt text to render on an <img> tag.
 *
 * ## Why we need this
 *
 * Empty alt text (`alt=""`) is technically valid for purely decorative images,
 * but for content images it's bad SEO and bad accessibility. Screen readers
 * will fall back to reading the file name (e.g. "image-1234567890.jpg"),
 * which helps no one.
 *
 * This helper picks, in order of preference:
 *   1. The user-provided alt (if non-empty after trim)
 *   2. A descriptive fallback derived from surrounding context
 *      (e.g. blog title + " — cover image")
 *   3. Empty string as a last resort (treat as decorative)
 *
 * @param providedAlt   the alt text the user entered in the admin panel
 * @param contextLabel  human-readable context (e.g. blog post title, row strip_title)
 * @param suffix        a short noun describing the image's role
 *                      (e.g. "cover image", "author photo", "section image")
 */
export const resolveImageAlt = (
  providedAlt: string | null | undefined,
  contextLabel?: string | null,
  suffix?: string,
): string => {
  const trimmed = (providedAlt ?? "").trim();
  if (trimmed.length > 0) return trimmed;

  const ctx = (contextLabel ?? "").trim();
  if (ctx.length > 0 && suffix) return `${ctx} — ${suffix}`;
  if (ctx.length > 0) return ctx;
  if (suffix) return suffix;

  return "";
};
