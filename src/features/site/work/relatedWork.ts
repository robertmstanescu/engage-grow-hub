/**
 * "More work in this area" on a case study: up to `max` other published
 * pieces, the same pillar first (in the site's order), then the rest to
 * fill the row. Internal links between pieces help readers and help
 * search engines see the Work section as one connected body of work.
 */
export interface RelatedCandidate {
  slug: string;
  pillar: string;
}

export const pickRelatedWork = <T extends RelatedCandidate>(items: T[] | null | undefined, current: { slug: string; pillar: string }, max = 3): T[] => {
  const pool = (Array.isArray(items) ? items : []).filter((i) => i && typeof i.slug === "string" && i.slug && i.slug !== current.slug);
  const same = pool.filter((i) => i.pillar === current.pillar);
  const rest = pool.filter((i) => i.pillar !== current.pillar);
  return [...same, ...rest].slice(0, Math.max(0, max));
};
