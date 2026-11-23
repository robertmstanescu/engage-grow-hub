/** Types for workSeo.mjs, so the unit test can import it. */
type Item = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Ld = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
export const WORK_PILLARS: Record<string, [string, string]>;
export const WORK_TYPES: Record<string, string>;
export const WORK_SELECT: string;
export function workIndexDescription(items: Item[], brandName?: string): string;
export function workItemMeta(item: Item): { title: string; description: string; image: string };
export function workItemArticleLd(
  item: Item,
  ctx: { abs: (p: string) => string; absImage: (s: string) => string; path: string; brandName: string; origin: string; person: Ld | null },
): Ld;
export function workReadable(item: Item, generic: { heading?: string; paragraphs?: string[] } | null): { heading: string; paragraphs: string[] };
export function workLlmsLines(items: Item[], abs: (p: string) => string): string[];
