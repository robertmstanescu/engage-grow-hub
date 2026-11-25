/**
 * The one title builder (search plan US04, US08): brand once, 60
 * characters at most, search title before page title.
 */
import { describe, it, expect } from "vitest";
import { buildPageTitle, TITLE_MAX } from "../../../scripts/lib/seoTitle.mjs";

const brand = "The Magic Coffin";

describe("buildPageTitle", () => {
  it("ends with the brand once", () => {
    expect(buildPageTitle({ searchTitle: "Internal communications", brand })).toBe("Internal communications | The Magic Coffin");
  });

  it("does not double a brand the editor already typed", () => {
    expect(buildPageTitle({ searchTitle: "Our Services | The Magic Coffin", brand })).toBe("Our Services | The Magic Coffin");
    expect(buildPageTitle({ searchTitle: "Our Services - the magic coffin", brand })).toBe("Our Services | The Magic Coffin");
  });

  it("uses the search title, then the page title, then the brand", () => {
    expect(buildPageTitle({ searchTitle: "Search", pageTitle: "Page", brand })).toBe("Search | The Magic Coffin");
    expect(buildPageTitle({ searchTitle: "  ", pageTitle: "Page", brand })).toBe("Page | The Magic Coffin");
    expect(buildPageTitle({ brand })).toBe(brand);
    expect(buildPageTitle({ pageTitle: brand, brand })).toBe(brand);
  });

  it("keeps every title within 60 characters and the brand whole", () => {
    const t = buildPageTitle({
      searchTitle: "A very long search title about onboarding buddies across three time zones",
      brand,
    });
    expect(t.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(t.endsWith(" | The Magic Coffin")).toBe(true);
    expect(t).toContain("…");
  });

  it("gives the Work fallback the brand once", () => {
    expect(buildPageTitle({ pageTitle: "Work: case studies and playbooks", brand })).toBe(
      "Work: case studies and playbooks | The Magic Coffin",
    );
  });

  it("works without a brand", () => {
    expect(buildPageTitle({ pageTitle: "Page" })).toBe("Page");
    expect(buildPageTitle({})).toBe("");
  });
});
