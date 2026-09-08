import { describe, expect, it, vi } from "vitest";
import {
  meshSpeed,
  parseCssColor,
  readMeshPalette,
  startBlooms,
} from "../meshBlooms";
import { buildPageMeshVars, DEFAULT_PAGE_MESH } from "../pageMesh";

describe("parseCssColor", () => {
  it("reads rgba() with alpha", () => {
    const c = parseCssColor("rgba(255, 0, 128, 0.7)")!;
    expect(c[0]).toBe(1);
    expect(c[1]).toBe(0);
    expect(c[2]).toBeCloseTo(128 / 255);
    expect(c[3]).toBeCloseTo(0.7);
  });
  it("reads rgb() and hex as opaque", () => {
    expect(parseCssColor("rgb(0, 0, 0)")).toEqual([0, 0, 0, 1]);
    expect(parseCssColor("#ffffff")).toEqual([1, 1, 1, 1]);
    expect(parseCssColor("#fff")).toEqual([1, 1, 1, 1]);
  });
  it("rejects junk", () => {
    expect(parseCssColor("")).toBeNull();
    expect(parseCssColor("hsl(1 2% 3%)")).toBeNull();
  });
});

describe("readMeshPalette", () => {
  it("packs the hero colours with strength baked in", () => {
    const vars = buildPageMeshVars({ colors: ["#ff0000", "#00ff00", "#0000ff", "#ffffff"], strength: 50 });
    const { base, drift } = readMeshPalette((n) => vars[n] ?? "");
    expect(Array.from(base.slice(0, 4))).toEqual([1, 0, 0, 0.5]);
    expect(Array.from(base.slice(4, 8))).toEqual([0, 1, 0, 0.5]);
    expect(drift[3]).toBe(0.5);
    expect(drift).toHaveLength(16);
  });
  it("falls back to the brand default per slot when a variable is missing", () => {
    const { base } = readMeshPalette(() => "");
    const expected = parseCssColor(buildPageMeshVars(DEFAULT_PAGE_MESH)["--mesh-c0"])!;
    Array.from(base.slice(0, 4)).forEach((v, i) => expect(v).toBeCloseTo(expected[i], 5));
  });
});

describe("meshSpeed", () => {
  it("honours motion and reduced-motion", () => {
    expect(meshSpeed("calm", false)).toBe(1);
    expect(meshSpeed(undefined, false)).toBe(1);
    expect(meshSpeed("lively", false)).toBe(2);
    expect(meshSpeed("off", false)).toBe(0);
    expect(meshSpeed("lively", true)).toBe(0);
  });
});

describe("startBlooms", () => {
  it("does nothing without WebGL so the blob fallback stays visible", () => {
    const layer = document.createElement("div");
    const canvas = {
      getContext: vi.fn(() => null),
      parentElement: layer,
      clientWidth: 100,
      clientHeight: 100,
      width: 0,
      height: 0,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const stop = startBlooms(canvas as never);
    expect(layer.getAttribute("data-mesh-gl")).toBeNull();
    expect(canvas.getContext).toHaveBeenCalledWith("webgl", expect.objectContaining({ alpha: true }));
    expect(() => stop()).not.toThrow();
  });
});
