import { describe, expect, it } from "vitest";
import { buildImageSrcSet, transformImageUrl } from "../mediaOptimization";

const SRC = "https://mbxqjjmjywsxibttjrgr.supabase.co/storage/v1/object/public/editor-images/gallery/photo.jpg";
const params = (u: string) => Object.fromEntries(new URL(u).searchParams);

describe("transformImageUrl", () => {
  it("crops on the server when the box is known", () => {
    const p = params(transformImageUrl(SRC, { width: 960, quality: 70, aspectRatio: 16 / 9 }));
    expect(p).toMatchObject({ width: "960", height: "540", resize: "cover", quality: "70", format: "webp" });
  });
  it("fits inside a tall box when the box is not known, so the picture keeps its shape", () => {
    // Width alone keeps the source's pixel height on Supabase (a 3457×2296
    // photo came back 960×2296), which showed as zoomed-in covers.
    const p = params(transformImageUrl(SRC, { width: 480 }));
    expect(p).toMatchObject({ width: "480", height: "1440", resize: "contain" });
  });
  it("uses the render endpoint and leaves other hosts alone", () => {
    expect(transformImageUrl(SRC, { width: 100 })).toContain("/storage/v1/render/image/public/");
    expect(transformImageUrl("https://example.com/a.png", { width: 100 })).toBe("https://example.com/a.png");
  });
});

describe("buildImageSrcSet", () => {
  it("carries the aspect ratio into every width", () => {
    const set = buildImageSrcSet(SRC, [480, 960], 70, 16 / 9);
    expect(set.split(", ").map((s) => params(s.split(" ")[0]).height)).toEqual(["270", "540"]);
  });
});
