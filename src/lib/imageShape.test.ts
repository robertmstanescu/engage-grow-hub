import { describe, it, expect } from "vitest";
import { resolveAspectRatio, focalObjectPosition, IMAGE_RATIO_OPTIONS } from "./imageShape";

describe("imageShape", () => {
  it("falls back to the caller's historic ratio when nothing is stored", () => {
    expect(resolveAspectRatio(undefined, 4 / 5)).toBeCloseTo(0.8);
    expect(resolveAspectRatio("", 3 / 4)).toBeCloseTo(0.75);
  });

  it("returns undefined for the Original preset so the file keeps its shape", () => {
    expect(resolveAspectRatio("original", 4 / 5)).toBeUndefined();
  });

  it("maps every preset to a ratio", () => {
    for (const o of IMAGE_RATIO_OPTIONS.filter((x) => x.value !== "original")) {
      expect(resolveAspectRatio(o.value)).toBe(o.ratio);
    }
  });

  it("defaults the focal point to the centre and clamps out-of-range values", () => {
    expect(focalObjectPosition(undefined, undefined)).toBe("50% 50%");
    expect(focalObjectPosition(-20, 140)).toBe("0% 100%");
    expect(focalObjectPosition(30, 70)).toBe("30% 70%");
  });
});
