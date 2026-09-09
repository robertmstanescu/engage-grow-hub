/**
 * imageShrink — make a picture web-sized in the browser BEFORE it uploads.
 *
 * A phone photo arrives as a 3–5 MB JPEG four thousand pixels wide; the
 * widest slot on the site is under 1,500 px. So every image upload goes
 * through here first: decode, scale the long edge down to `maxEdge`,
 * re-encode as WebP at `quality`. Typical result: 2.9 MB → 250 KB, with
 * no visible difference at the sizes the site shows.
 *
 * What is left alone: SVG (vector), GIF (animation), AVIF (already
 * small), anything that is not an image, small files, and any case where
 * the browser cannot decode or the re-encode is not smaller. Failure of
 * any kind returns the original file, so an upload never breaks because
 * of this step. Orientation follows the EXIF flag via createImageBitmap.
 */

export interface ShrinkOptions {
  /** Longest side after scaling, in pixels. */
  maxEdge?: number;
  /** WebP quality 0–1. */
  quality?: number;
  /** Files at or under this many bytes are sent as they are. */
  minBytes?: number;
}

export const SHRINK_DEFAULTS: Required<ShrinkOptions> = { maxEdge: 2400, quality: 0.82, minBytes: 200 * 1024 };

/** Only raster photos and PNGs benefit; the rest are passed through. */
export const shouldShrink = (file: { type: string; size: number }, minBytes = SHRINK_DEFAULTS.minBytes): boolean => {
  if (!file.type.startsWith("image/")) return false;
  if (/svg|gif|avif|x-icon|vnd\.microsoft\.icon/i.test(file.type)) return false;
  return file.size > minBytes;
};

const webpName = (name: string) => `${name.replace(/\.[^.]+$/, "") || "picture"}.webp`;

export async function shrinkImage(file: File, opts: ShrinkOptions = {}): Promise<File> {
  const { maxEdge, quality, minBytes } = { ...SHRINK_DEFAULTS, ...opts };
  if (!shouldShrink(file, minBytes)) return file;
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob || blob.size === 0) return file;
    // Not scaled and not meaningfully smaller: keep the original bytes.
    if (scale === 1 && blob.size > file.size * 0.9) return file;
    return new File([blob], webpName(file.name), { type: "image/webp", lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    bitmap?.close?.();
  }
}
