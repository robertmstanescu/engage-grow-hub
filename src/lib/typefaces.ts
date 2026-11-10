/**
 * The site's typefaces, and the names they replaced.
 *
 * The owner changed two faces on 10 Nov 2026: headings from Bricolage
 * Grotesque to Funnel Display, handwriting from Architects Daughter to
 * Playwrite Cuba. Brand settings and rich text saved before that still
 * carry the old names; `currentFace` reads them as the new faces at
 * render time so nothing saved has to be rewritten.
 */
export const HEADING_FACE = "Funnel Display";
export const HAND_FACE = "Playwrite CU";

const RETIRED: [RegExp, string][] = [
  [/Bricolage Grotesque/g, HEADING_FACE],
  [/Architects Daughter/g, HAND_FACE],
];

/** Swap any retired face name in a font-family value or an HTML string. */
export const currentFace = (value: string): string => {
  if (typeof value !== "string" || !value) return value;
  let out = value;
  for (const [old, now] of RETIRED) out = out.replace(old, now);
  return out;
};
