/**
 * Brand color for each of the 4 service pillars, keyed by the slug
 * segment after `/services/`. Single source of truth so every place a
 * pillar's identity shows up in color — the pillar's own page palette
 * (PillarEditor / ServiceRow), blog post category badges
 * (useTagColors.ts), and card grids that link out to a pillar
 * (BoxedRow.tsx) — agrees.
 */
export const PILLAR_COLORS: Record<string, string> = {
  "internal-communications": "#43143B",
  "employee-experience": "#002B67",
  "people-operations": "#6A010E",
  "fractional-hrbp": "#003728",
};

/**
 * Resolve a pillar's brand color from a link URL such as
 * `/services/employee-experience` — returns `undefined` for anything
 * that isn't one of the 4 known pillar links (a non-pillar card, an
 * external URL, an anchor link, etc.) so callers can fall back to their
 * own default.
 */
export const pillarColorFromLink = (linkUrl: string | undefined): string | undefined => {
  if (!linkUrl) return undefined;
  const match = linkUrl.match(/^\/services\/([a-z0-9-]+)\/?$/);
  return match ? PILLAR_COLORS[match[1]] : undefined;
};
