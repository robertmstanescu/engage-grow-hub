/**
 * The top-three band: moves on by itself, stops for good on Pause or a
 * picked slide, hides numbers tied to unapproved proof, keeps only the
 * showing slide reachable, and reads its saved slugs safely.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WorkFeatured, { FEATURED_INTERVAL_MS } from "./WorkFeatured";
import { readWorkPage, WORK_PAGE_DEFAULTS } from "./workPageContent";
import type { WorkCardItem } from "@/features/site/WorkCard";

const piece = (slug: string, extra: Partial<WorkCardItem> = {}): WorkCardItem => ({
  slug,
  type: "case",
  pillar: "ic",
  title: `Title ${slug}`,
  summary: "Summary",
  metric: "~60%",
  metric_label: "live attendance",
  proof_point_id: null,
  card_style: "photo",
  pull_line: "",
  cover_image: "/work/x/cover.webp",
  cover_image_alt: "",
  link_out: "",
  has_case_study: true,
  ...extra,
});

const draw = (items: WorkCardItem[], approved = new Set<string>()) =>
  render(
    <MemoryRouter>
      <WorkFeatured items={items} label="Start with these three" approved={approved} />
    </MemoryRouter>,
  );

const activeTitle = (c: HTMLElement) => c.querySelector('[data-active="true"] .work-featured-title')?.textContent;

afterEach(() => vi.useRealTimers());

describe("WorkFeatured", () => {
  it("moves on by itself and wraps round", () => {
    vi.useFakeTimers();
    const { container } = draw([piece("a"), piece("b"), piece("c")]);
    expect(activeTitle(container)).toBe("Title a");
    act(() => { vi.advanceTimersByTime(FEATURED_INTERVAL_MS); });
    expect(activeTitle(container)).toBe("Title b");
    act(() => { vi.advanceTimersByTime(FEATURED_INTERVAL_MS); });
    act(() => { vi.advanceTimersByTime(FEATURED_INTERVAL_MS); });
    expect(activeTitle(container)).toBe("Title a");
  });

  it("stays still after Pause and after a picked slide", () => {
    vi.useFakeTimers();
    const { container } = draw([piece("a"), piece("b"), piece("c")]);
    fireEvent.click(screen.getByRole("button", { name: /Show 3 of 3/ }));
    expect(activeTitle(container)).toBe("Title c");
    act(() => { vi.advanceTimersByTime(FEATURED_INTERVAL_MS * 3); });
    expect(activeTitle(container)).toBe("Title c");
    expect(screen.getByRole("button", { name: "Play the slides" })).toBeTruthy();
  });

  it("keeps only the showing slide reachable", () => {
    const { container } = draw([piece("a"), piece("b")]);
    const slides = container.querySelectorAll(".work-featured-slide");
    expect(slides[0].hasAttribute("inert")).toBe(false);
    expect(slides[1].hasAttribute("inert")).toBe(true);
  });

  it("hides a number tied to an unapproved proof point", () => {
    const { container, rerender } = draw([piece("a", { proof_point_id: "p1" })]);
    expect(container.querySelector(".work-featured-metric")).toBeNull();
    rerender(
      <MemoryRouter>
        <WorkFeatured items={[piece("a", { proof_point_id: "p1" })]} approved={new Set(["p1"])} />
      </MemoryRouter>,
    );
    expect(container.querySelector(".work-featured-metric")?.textContent).toBe("~60%");
  });

  it("shows no controls for a single piece and nothing for none", () => {
    const { container } = draw([piece("a")]);
    expect(container.querySelector(".work-featured-controls")).toBeNull();
    const empty = draw([]);
    expect(empty.container.querySelector(".work-featured")).toBeNull();
  });

  it("never links a script address", () => {
    const { container } = draw([piece("a", { link_out: "javascript:alert(1)", has_case_study: false })]);
    expect(container.querySelector('a[href^="javascript"]')).toBeNull();
  });
});

describe("readWorkPage featured slugs", () => {
  it("uses the defaults until something is saved", () => {
    expect(readWorkPage({}).featured_slugs).toEqual(WORK_PAGE_DEFAULTS.featured_slugs);
  });
  it("keeps saved slugs clean, unique and at most three", () => {
    expect(readWorkPage({ featured_slugs: [" a ", "a", 3, "", "b", "c", "d"] }).featured_slugs).toEqual(["a", "b", "c"]);
    expect(readWorkPage({ featured_slugs: [] }).featured_slugs).toEqual([]);
  });
});
