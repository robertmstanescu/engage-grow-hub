/**
 * Zoom and pan maths for the world map, kept apart from the component
 * so it can be tested without a browser. The map is an SVG with a fixed
 * drawing size; zooming narrows the `viewBox` window onto it.
 *
 * A view is the zoom factor `k` (1 = the whole world) and the top-left
 * corner (`x`, `y`) of the window, in drawing units.
 */
export const MAP_W = 1200;
export const MAP_H = 560;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;
/** One press of the plus or minus button. */
export const ZOOM_STEP = 1.6;

export interface MapView { k: number; x: number; y: number }

export const WHOLE_WORLD: MapView = { k: 1, x: 0, y: 0 };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const finite = (n: number, fallback: number) => (Number.isFinite(n) ? n : fallback);

/** Keep the zoom in range and the window inside the drawing. */
export const clampView = (v: MapView): MapView => {
  const k = clamp(finite(v.k, 1), MIN_ZOOM, MAX_ZOOM);
  const w = MAP_W / k;
  const h = MAP_H / k;
  return {
    k,
    x: clamp(finite(v.x, 0), 0, MAP_W - w),
    y: clamp(finite(v.y, 0), 0, MAP_H - h),
  };
};

/**
 * Zoom by `factor` while the point under the pointer stays put.
 * `fx`/`fy` are that point's position across the map box, 0 to 1
 * (0.5, 0.5 is the middle, used by the buttons).
 */
export const zoomAt = (v: MapView, factor: number, fx = 0.5, fy = 0.5): MapView => {
  const k = clamp(v.k * finite(factor, 1), MIN_ZOOM, MAX_ZOOM);
  const px = v.x + (MAP_W / v.k) * clamp(finite(fx, 0.5), 0, 1);
  const py = v.y + (MAP_H / v.k) * clamp(finite(fy, 0.5), 0, 1);
  return clampView({
    k,
    x: px - (MAP_W / k) * clamp(finite(fx, 0.5), 0, 1),
    y: py - (MAP_H / k) * clamp(finite(fy, 0.5), 0, 1),
  });
};

/** Drag: move the window by a fraction of the map box (1 = one box width). */
export const panBy = (v: MapView, dfx: number, dfy: number): MapView =>
  clampView({
    k: v.k,
    x: v.x - (MAP_W / v.k) * finite(dfx, 0),
    y: v.y - (MAP_H / v.k) * finite(dfy, 0),
  });

/** The SVG `viewBox` attribute for a view. */
export const viewBoxOf = (v: MapView): string => {
  const c = clampView(v);
  const r = (n: number) => Math.round(n * 100) / 100;
  return `${r(c.x)} ${r(c.y)} ${r(MAP_W / c.k)} ${r(MAP_H / c.k)}`;
};
