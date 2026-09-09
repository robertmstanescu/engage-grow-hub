/** Public URL path for a CMS page slug: service pages live at /services/…, the rest under /p/. */
export const cmsPagePath = (slug: string): string =>
  slug === "services" || slug.startsWith("services/") ? `/${slug}/` : `/p/${slug}/`;
