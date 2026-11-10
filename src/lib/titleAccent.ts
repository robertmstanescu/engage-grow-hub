/**
 * Named title accents + the hand-drawn gold underline (redesign §2.3).
 *
 * Title lines historically carry inline rgb colours written by the
 * editor. Named accents let NEW content say "brand", "gold" or a pillar
 * key instead, so a palette change restyles every title at once. The
 * renderer supports both forever — stored inline colours are never
 * rewritten.
 */
import { pillarColorFromKey } from "@/lib/constants/pillarColors";

const NAMED: Record<string, string> = {
  brand: "hsl(var(--hero-title-accent))",
  // Stored name stays "gold"; the colour is Revolver (owner, 10 Nov 2026).
  gold: "hsl(var(--revolver))",
};

/** Resolve a named accent ("brand" | "gold" | pillar key/slug) to a colour. */
export const resolveAccentColor = (name: string | undefined): string | undefined => {
  if (!name) return undefined;
  return NAMED[name] ?? pillarColorFromKey(name);
};

/**
 * Wrap the FIRST occurrence of `word` in the hand-drawn underline span.
 * Operates on the HTML string a title line is stored as, replacing only
 * inside text segments (never inside a tag). Unknown word → unchanged.
 */
export const applyUnderlineWord = (html: string, word: string | undefined): string => {
  const w = (word || "").trim();
  if (!w) return html;
  const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped);
  let done = false;
  return html
    .split(/(<[^>]+>)/g)
    .map((seg) => {
      if (done || seg.startsWith("<")) return seg;
      if (!re.test(seg)) return seg;
      done = true;
      return seg.replace(re, `<span class="mc-underline">${w}</span>`);
    })
    .join("");
};
