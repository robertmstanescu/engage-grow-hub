import { describe, expect, it } from "vitest";
import { shouldShrink, shrinkImage } from "../imageShrink";

const f = (name: string, type: string, bytes: number) => new File([new Uint8Array(bytes)], name, { type });

describe("image shrink", () => {
  it("only shrinks raster pictures above the size floor", () => {
    expect(shouldShrink(f("a.jpg", "image/jpeg", 3_000_000))).toBe(true);
    expect(shouldShrink(f("a.png", "image/png", 900_000))).toBe(true);
    expect(shouldShrink(f("a.jpg", "image/jpeg", 50_000))).toBe(false);
    expect(shouldShrink(f("logo.svg", "image/svg+xml", 900_000))).toBe(false);
    expect(shouldShrink(f("anim.gif", "image/gif", 900_000))).toBe(false);
    expect(shouldShrink(f("deck.pdf", "application/pdf", 9_000_000))).toBe(false);
    expect(shouldShrink(f("clip.mp4", "video/mp4", 9_000_000))).toBe(false);
  });

  it("returns the original whenever it cannot or should not re-encode", async () => {
    const pdf = f("deck.pdf", "application/pdf", 9_000_000);
    expect(await shrinkImage(pdf)).toBe(pdf);
    // jsdom has no createImageBitmap: the upload must still go through.
    const jpg = f("photo.jpg", "image/jpeg", 3_000_000);
    expect(await shrinkImage(jpg)).toBe(jpg);
  });
});
