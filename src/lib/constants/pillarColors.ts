/**
 * Brand color for each of the 6 service pillars, keyed by the slug
 * segment after `/services/`. Single source of truth so every place a
 * pillar's identity shows up in color — the pillar's own page palette
 * (PillarEditor / ServiceRow), blog post category badges
 * (useTagColors.ts), card grids that link out to a pillar
 * (BoxedRow.tsx), footer dots, the world map and work cards — agrees.
 */
export const PILLAR_COLORS: Record<string, string> = {
  // The owner's pairs of 10 Nov 2026, all from the brand's secondary
  // palette: the accent (titles, top line, dot, link, tag) and, below,
  // the lighter partner a card is tinted with.
  "internal-communications": "#3D348B", // Persian Indigo
  "employee-experience": "#0047AB", // Cobalt Blue
  "people-operations": "#B11226", // American Crimson
  "fractional-hrbp": "#005C42", // Evening Sea
  "pay-transparency": "#E36414", // Mars Yellow
  "manager-enablement": "#702963", // Byzantium
};

/**
 * The lighter partner of each accent: the colour a service card's glass
 * is tinted with (`--card-tint`, used at a quarter strength).
 */
export const PILLAR_CARD_TINTS: Record<string, string> = {
  "internal-communications": "#6B61C3", // Prince
  "employee-experience": "#307FEF", // Tech Blue
  "people-operations": "#F8465C", // Red Crystal
  "fractional-hrbp": "#1A8164", // Dark Jungle Green
  "pay-transparency": "#FF8D45", // Comforting Orange
  "manager-enablement": "#9D4D8E", // Lavender Red
};

/**
 * Small text in a service colour (numbers, links, tags with white text)
 * needs enough contrast. Mars Yellow is too light at that size, so Pay
 * Transparency's small text uses Peru Tan from the brand book (owner,
 * 10 Nov 2026). Every other service uses its accent.
 */
export const PILLAR_TEXT_COLORS: Record<string, string> = {
  ...PILLAR_COLORS,
  "pay-transparency": "#883500", // Peru Tan
};

/** The small-text colour for a card, from its service link or key. */
export const pillarTextColor = (link: string | undefined, key?: string): string | undefined => {
  const slug = link?.match(/^\/services\/([a-z0-9-]+)\/?$/)?.[1] ?? (key ? PILLAR_KEY_TO_SLUG[key] ?? key : undefined);
  return slug ? PILLAR_TEXT_COLORS[slug] : undefined;
};

/**
 * The colours the six services carried before 10 Nov 2026. Peru Tan
 * #883500 is listed because it was Pay Transparency's accent; it now
 * serves only as that service's small-text colour. Kept so a
 * check can tell saved content that still names one.
 */
export const RETIRED_PILLAR_COLORS = ["#43143B", "#002B67", "#6A010E", "#003728", "#883500", "#201A53"] as const;

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

/** The card tint for a pillar, from a short key, a slug or a link. */
export const pillarTintFrom = (keyOrLink: string | undefined): string | undefined => {
  if (!keyOrLink) return undefined;
  const slug = keyOrLink.match(/^\/services\/([a-z0-9-]+)\/?$/)?.[1] ?? PILLAR_KEY_TO_SLUG[keyOrLink] ?? keyOrLink;
  return PILLAR_CARD_TINTS[slug];
};
