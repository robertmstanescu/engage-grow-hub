import { describe, expect, it } from "vitest";
import { MAP_H, MAP_W, MAX_ZOOM, WHOLE_WORLD, clampView, panBy, viewBoxOf, zoomAt } from "./zoom";

describe("world map zoom", () => {
  it("starts on the whole world", () => {
    expect(viewBoxOf(WHOLE_WORLD)).toBe(`0 0 ${MAP_W} ${MAP_H}`);
  });

  it("zooms about the middle and keeps the middle still", () => {
    const v = zoomAt(WHOLE_WORLD, 2);
    expect(v).toEqual({ k: 2, x: 300, y: 140 });
    expect(viewBoxOf(v)).toBe("300 140 600 280");
  });

  it("keeps the point under the pointer still", () => {
    const v = zoomAt(WHOLE_WORLD, 2, 0.25, 0.75);
    // The point at 25% / 75% of the box is still drawing point 300, 420.
    expect(v.x + (MAP_W / v.k) * 0.25).toBeCloseTo(300);
    expect(v.y + (MAP_H / v.k) * 0.75).toBeCloseTo(420);
  });

  it("never zooms out past the whole world or in past the limit", () => {
    expect(zoomAt(WHOLE_WORLD, 0.1)).toEqual(WHOLE_WORLD);
    expect(zoomAt(WHOLE_WORLD, 1000).k).toBe(MAX_ZOOM);
  });

  it("zooming back out returns to the whole world", () => {
    let v = zoomAt(WHOLE_WORLD, 4, 0.9, 0.1);
    v = zoomAt(v, 0.25, 0.2, 0.8);
    expect(v).toEqual(WHOLE_WORLD);
  });

  it("drags the window but never off the drawing", () => {
    const v = zoomAt(WHOLE_WORLD, 2);
    expect(panBy(v, 0.1, 0)).toEqual({ k: 2, x: 240, y: 140 });
    expect(panBy(v, 50, 50)).toEqual({ k: 2, x: 0, y: 0 });
    expect(panBy(v, -50, -50)).toEqual({ k: 2, x: 600, y: 280 });
    expect(panBy(WHOLE_WORLD, 0.5, 0.5)).toEqual(WHOLE_WORLD);
  });

  it("copes with odd numbers", () => {
    expect(clampView({ k: NaN, x: Infinity, y: -5 })).toEqual(WHOLE_WORLD);
    expect(zoomAt(WHOLE_WORLD, NaN, NaN, NaN)).toEqual(WHOLE_WORLD);
    expect(panBy(WHOLE_WORLD, NaN, NaN)).toEqual(WHOLE_WORLD);
  });
});
