import { describe, it, expect } from "vitest";
import { resolveAuthor } from "../authorProfile";

const post = { author_name: "Old Name", author_image: "old.png", author_image_alt: "Old alt" };

describe("resolveAuthor", () => {
  it("uses the site's author profile when it is filled in", () => {
    const a = resolveAuthor({ name: "Robert", photo: "new.png", photo_alt: "New alt" }, post);
    expect(a).toEqual({ name: "Robert", photo: "new.png", photoAlt: "New alt" });
  });

  it("falls back to what the post stored while the profile is empty", () => {
    expect(resolveAuthor({}, post)).toEqual({ name: "Old Name", photo: "old.png", photoAlt: "Old alt" });
    expect(resolveAuthor(null, post)).toEqual({ name: "Old Name", photo: "old.png", photoAlt: "Old alt" });
  });

  it("falls back field by field, so a name without a photo keeps the post's photo", () => {
    const a = resolveAuthor({ name: "Robert" }, post);
    expect(a.name).toBe("Robert");
    expect(a.photo).toBe("old.png");
  });

  it("does not carry the post's alt text onto the profile's photo", () => {
    expect(resolveAuthor({ name: "Robert", photo: "new.png" }, post).photoAlt).toBe("Robert");
  });

  it("is empty when neither side says anything", () => {
    expect(resolveAuthor({}, {})).toEqual({ name: "", photo: "", photoAlt: "" });
  });
});
