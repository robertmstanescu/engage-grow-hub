/**
 * WorkCard holds up against whatever a work item contains: missing
 * fields, an unknown style, a script link, an unapproved number.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WorkCard, { type WorkCardItem } from "./WorkCard";

const base: WorkCardItem = {
  slug: "town-halls",
  type: "case",
  pillar: "ic",
  title: "Getting people to show up live",
  summary: "Town Halls across time zones.",
  metric: "~60%",
  metric_label: "average live attendance",
  proof_point_id: null,
  card_style: "photo",
  pull_line: "",
  cover_image: "https://example.com/cover.jpg",
  cover_image_alt: "",
  link_out: "",
  has_case_study: true,
};

const draw = (item: Partial<WorkCardItem>, props: { proofApproved?: boolean } = {}) =>
  render(
    <MemoryRouter>
      <WorkCard item={{ ...base, ...item } as WorkCardItem} {...props} />
    </MemoryRouter>,
  ).container;

describe("WorkCard", () => {
  it("draws a photo card with its chip, pillar and metric, linked to the case study", () => {
    const c = draw({});
    const card = c.querySelector("[data-card-style]")!;
    expect(card.getAttribute("data-card-style")).toBe("photo");
    expect(card.getAttribute("href")).toBe("/work/town-halls/");
    expect(c.querySelector(".work-chip")?.textContent).toBe("Case");
    expect(c.textContent).toContain("Internal Communications");
    expect(c.querySelector(".work-card-metric")?.textContent).toBe("~60%");
    expect(c.querySelector("img")).not.toBeNull();
  });

  it("falls back to the number style without a usable cover", () => {
    for (const cover of ["", "javascript:alert(1)", null as unknown as string]) {
      const c = draw({ cover_image: cover });
      expect(c.querySelector("[data-card-style]")!.getAttribute("data-card-style")).toBe("number");
      expect(c.querySelector("img")).toBeNull();
    }
  });

  it("hides a number whose proof point is not approved and keeps the label", () => {
    const hidden = draw({ proof_point_id: "p1" }, { proofApproved: false });
    expect(hidden.textContent).not.toContain("~60%");
    expect(hidden.textContent).toContain("average live attendance");
    const shown = draw({ proof_point_id: "p1" }, { proofApproved: true });
    expect(shown.textContent).toContain("~60%");
  });

  it("never links to a script address and is not a link without a destination", () => {
    const c = draw({ link_out: "javascript:alert(1)", has_case_study: false });
    expect(c.querySelector("a")).toBeNull();
    expect(c.querySelector("article")).not.toBeNull();
  });

  it("opens an outside link in a new tab without handing over the opener", () => {
    const a = draw({ link_out: "https://example.com/posts" }).querySelector("a")!;
    expect(a.getAttribute("href")).toBe("https://example.com/posts");
    expect(a.getAttribute("rel")).toContain("noopener");
  });

  it("survives empty and unknown data", () => {
    const c = draw({ type: "weird", pillar: "nope", card_style: "nonsense", title: "", summary: null as unknown as string, metric: null as unknown as string, metric_label: "", pull_line: null as unknown as string, cover_image: "" });
    expect(c.querySelector(".work-chip")).toBeNull();
    expect(c.textContent).not.toContain("nope");
    expect(c.querySelector("[data-card-style]")).not.toBeNull();
  });
});
