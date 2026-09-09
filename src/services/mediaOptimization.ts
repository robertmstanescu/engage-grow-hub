/**
 * ─────────────────────────────────────────────────────────────────────────
 * mediaOptimization.ts — Supabase Image Transformations helper
 * ─────────────────────────────────────────────────────────────────────────
 *
 * WHAT THIS DOES
 * ──────────────
 * Rewrites a Supabase Storage public URL so the CDN re-encodes the image
 * on the fly to a target width and modern format (WebP). The original
 * upload is never modified — Supabase serves a cached, transformed copy.
 *
 * Input  : https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
 * Output : https://<ref>.supabase.co/storage/v1/render/image/public/<bucket>/<path>?width=…&quality=…&format=…
 *
 * URLs that don't match the Supabase Storage shape (third-party images,
 * data URIs, relative paths) are returned UNCHANGED so the call is safe
 * to apply unconditionally.
 *
 * WHY THIS MATTERS FOR LCP
 * ────────────────────────
 * The hero background is almost always the LCP element on the homepage.
 * A 4MB raw PNG dropped into Supabase by an admin will take ~2s to
 * download on a 3G connection — long enough to fail Core Web Vitals.
 * Re-encoded to WebP at the user's actual viewport width, the same
 * image is typically <200KB and paints in <500ms.
 * ─────────────────────────────────────────────────────────────────────── */

/** Supabase Storage public-URL pattern. We rewrite the segment after `/storage/v1/`. */
const SUPABASE_PUBLIC_OBJECT_RE = /\/storage\/v1\/object\/public\//;

export interface ImageTransformOptions {
  /** Target width in CSS pixels. The CDN downscales (never upscales beyond original). */
  width: number;
  /** 1–100. Defaults to 75 — the sweet spot for WebP quality vs. size. */
  quality?: number;
  /** Output format. `webp` is broadly supported and cuts size ~30% vs. JPEG. */
  format?: "webp" | "origin";
  /**
   * The CSS container's width/height ratio (e.g. 4/5, 1 for a square).
   * REQUIRED to get a correctly-cropped, correctly-sized file whenever the
   * image renders into a fixed-aspect box — verified directly against the
   * live endpoint: given `width` alone, Supabase's image transform leaves
   * the height completely untouched at the SOURCE image's native pixel
   * height, regardless of `resize` mode. A 5000×5000 source requested at
   * width=800 comes back 800×5000, not 800×800 — so a browser applying
   * `object-fit: cover` into a 3:4 box then crops an already-wrong-aspect
   * sliver down to a razor-thin strip (this is exactly what produced the
   * "images zoomed in way too much" bug on /about-us). Pass this whenever
   * the caller knows its target aspect ratio. Without it the request asks
   * for `resize=contain` inside a tall box, so the picture keeps its own
   * shape (a logo, a full-bleed hero background).
   */
  aspectRatio?: number;
}

/**
 * Returns true if `url` is a Supabase Storage public-object URL we can transform.
 * Used by the hero/og:image flows to decide whether to bother building a srcSet.
 */
export const isSupabaseStorageUrl = (url: string | undefined | null): boolean =>
  !!url && SUPABASE_PUBLIC_OBJECT_RE.test(url);

/**
 * Rewrite a Supabase Storage URL to request an on-the-fly resize/transcode.
 * Non-Supabase URLs and bad inputs are returned as-is.
 */
export const transformImageUrl = (
  url: string | undefined | null,
  opts: ImageTransformOptions,
): string => {
  if (!url) return url || "";
  if (!isSupabaseStorageUrl(url)) return url;

  const transformed = url.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/",
  );

  const params = new URLSearchParams();
  params.set("width", String(Math.round(opts.width)));
  params.set("quality", String(opts.quality ?? 75));
  params.set("format", opts.format ?? "webp");
  if (opts.aspectRatio) {
    // The caller knows the box: crop to it on the server.
    params.set("height", String(Math.round(opts.width / opts.aspectRatio)));
    params.set("resize", "cover");
  } else {
    // No box known: fit inside a generous one so the picture keeps its own
    // shape. Measured against the live endpoint on 9 Sept 2026: `width`
    // alone keeps the SOURCE's pixel height (a 3457×2296 photo asked at
    // width=960 came back 960×2296, squeezed sideways), which is what
    // made blog covers and the logo look zoomed in. With `resize=contain`
    // and a tall enough height the same request returns 960×638.
    params.set("height", String(Math.round(opts.width * 3)));
    params.set("resize", "contain");
  }

  return `${transformed}?${params.toString()}`;
};

/** Default breakpoints used to build the hero `srcSet`. Aligned with common device widths. */
export const HERO_SRCSET_WIDTHS = [640, 960, 1280, 1600, 1920, 2400] as const;

/**
 * Build a comma-separated `srcSet` string for an `<img>` tag, e.g.
 *   "url?width=640 640w, url?width=960 960w, …"
 *
 * Returns an empty string for non-Supabase URLs so callers can skip the
 * srcSet attribute entirely (a single `src` is enough for opaque CDNs).
 */
export const buildImageSrcSet = (
  url: string | undefined | null,
  widths: readonly number[] = HERO_SRCSET_WIDTHS,
  quality = 75,
  aspectRatio?: number,
): string => {
  if (!isSupabaseStorageUrl(url)) return "";
  return widths
    .map((w) => `${transformImageUrl(url, { width: w, quality, aspectRatio })} ${w}w`)
    .join(", ");
};

/**
 * Tiny LQIP (Low-Quality Image Placeholder) URL — a 24px-wide, low-quality
 * WebP rendition of the same image. Used as the `poster` for hero <video>
 * elements so the browser has something to paint before the video itself
 * starts streaming.
 *
 * For non-Supabase URLs we fall back to the unchanged source — most third-
 * party CDNs already serve reasonably-sized previews.
 */
export const buildPosterUrl = (url: string | undefined | null): string => {
  if (!url) return "";
  if (!isSupabaseStorageUrl(url)) return url;
  return transformImageUrl(url, { width: 1280, quality: 60, format: "webp" });
};
