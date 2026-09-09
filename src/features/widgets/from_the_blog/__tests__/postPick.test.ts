import { describe, expect, it } from "vitest";
import { blogLinkFor, pickPosts } from "../postPick";

const posts = [
  { slug: "a", category: "People Experience" },
  { slug: "b", category: "People Operations & AI" },
  { slug: "c", category: "People Operations & AI" },
  { slug: "d", category: "Internal Communications" },
  { slug: "e", category: null },
];

describe("pickPosts", () => {
  it("puts the chosen categories first and fills with the newest others", () => {
    expect(pickPosts(posts, ["People Operations & AI"], 3).map((p) => p.slug)).toEqual(["b", "c", "a"]);
  });
  it("shows the newest posts when no category is chosen", () => {
    expect(pickPosts(posts, [], 3).map((p) => p.slug)).toEqual(["a", "b", "c"]);
  });
  it("ignores blank category lines and respects the limit", () => {
    expect(pickPosts(posts, ["", "  "], 2).map((p) => p.slug)).toEqual(["a", "b"]);
  });
});

describe("blogLinkFor", () => {
  it("filters the blog by the category that matched", () => {
    const picked = pickPosts(posts, ["People Operations & AI"], 3);
    expect(blogLinkFor(picked, ["People Operations & AI"])).toBe("/blog/?category=People%20Operations%20%26%20AI");
  });
  it("links to the whole blog when nothing matched", () => {
    expect(blogLinkFor(pickPosts(posts, ["Nope"], 3), ["Nope"])).toBe("/blog/");
  });
});
