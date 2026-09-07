/**
 * imageShape.ts — shared image *shape* (aspect-ratio preset) + focal point.
 *
 * One vocabulary for every image field in the CMS so an admin can decide
 * whether a picture is square, portrait, landscape, wide or a banner, and
 * which part of it must stay visible when it gets cropped (the focal point).
 *
 * Storage contract (all optional, all live next to the image URL field):
 *   <field>_ratio    : ImageRatioPreset  — defaults to the caller's own shape
 *   <field>_focal_x  : number 0–100      — defaults to 50 (centre)
 *   <field>_focal_y  : number 0–100      — defaults to 50 (centre)
 *
 * Rendering contract: `aspectRatio` goes on the *frame* element,
 * `objectPosition` on the `<img>` itself (with `object-fit: cover`).
 */

export type ImageRatioPreset =
  | "original"
  | "square"
  | "portrait"
  | "landscape"
  | "wide"
  | "banner";

export interface ImageRatioOption {
  value: ImageRatioPreset;
  label: string;
  /** width / height. `undefined` = keep the file's own proportions. */
  ratio?: number;
}

export const IMAGE_RATIO_OPTIONS: ImageRatioOption[] = [
  { value: "original", label: "Original" },
  { value: "square", label: "Square (1:1)", ratio: 1 },
  { value: "portrait", label: "Portrait (4:5)", ratio: 4 / 5 },
  { value: "landscape", label: "Landscape (4:3)", ratio: 4 / 3 },
  { value: "wide", label: "Wide (16:9)", ratio: 16 / 9 },
  { value: "banner", label: "Banner (21:9)", ratio: 21 / 9 },
];

const BY_VALUE = new Map(IMAGE_RATIO_OPTIONS.map((o) => [o.value, o]));

/**
 * Resolve the numeric aspect ratio for a stored preset.
 * `fallback` is the row's own historic shape so untouched content is
 * pixel-identical to before this control existed.
 */
export const resolveAspectRatio = (
  preset: string | undefined | null,
  fallback?: number,
): number | undefined => {
  if (!preset || preset === "original") return preset === "original" ? undefined : fallback;
  return BY_VALUE.get(preset as ImageRatioPreset)?.ratio ?? fallback;
};

const clampPct = (n: unknown, dflt = 50): number => {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return dflt;
  return Math.min(100, Math.max(0, v));
};

/** CSS `object-position` string from stored percentage focal coordinates. */
export const focalObjectPosition = (x?: unknown, y?: unknown): string =>
  `${clampPct(x)}% ${clampPct(y)}%`;

export const clampFocal = clampPct;
