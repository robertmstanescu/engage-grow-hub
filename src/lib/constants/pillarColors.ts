/**
 * Brand color for each of the 6 service pillars, keyed by the slug
 * segment after `/services/`. Single source of truth so every place a
 * pillar's identity shows up in color — the pillar's own page palette
 * (PillarEditor / ServiceRow), blog post category badges
 * (useTagColors.ts), card grids that link out to a pillar
 * (BoxedRow.tsx), footer dots, the world map and work cards — agrees.
 */
export const PILLAR_COLORS: Record<string, string> = {
  "internal-communications": "#43143B",
  "employee-experience": "#002B67",
  "people-operations": "#6A010E",
  "fractional-hrbp": "#003728",
  "pay-transparency": "#883500",
  "manager-enablement": "#201A53",
};

/**
 * Short pillar keys used by data that is not a URL — work items, the
 * world map groups, proof points (`ic`, `ex`, `ops`, `hrbp`, `pay`,
 * `mgr`). Maps each short key to its page slug so both addressing
 * styles resolve to the same colour.
 */
export const PILLAR_KEY_TO_SLUG: Record<string, string> = {
  ic: "internal-communications",
  ex: "employee-experience",
  ops: "people-operations",
  hrbp: "fractional-hrbp",
  pay: "pay-transparency",
  mgr: "manager-enablement",
};

/** Resolve a pillar colour from a short key (`pay`) or a slug. */
export const pillarColorFromKey = (key: string | undefined): string | undefined => {
  if (!key) return undefined;
  return PILLAR_COLORS[key] ?? PILLAR_COLORS[PILLAR_KEY_TO_SLUG[key] ?? ""];
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
