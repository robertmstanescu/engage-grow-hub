import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import BoxedRow from "../BoxedRow";
import type { PageRow } from "@/types/rows";

/**
 * A boxed card can carry both `link_url` (wraps the whole card in an <a>)
 * and `cta_url`/`cta_label` (renders a CTA button inside the card). Nesting
 * an <a> inside another <a> is invalid HTML5 and produces inconsistent
 * click targets / screen-reader behavior across browsers, so the CTA must
 * render as a non-anchor element whenever the card itself is a link.
 */
const makeRow = (card: Record<string, any>): PageRow => ({
  id: "row-1",
  type: "boxed",
  strip_title: "",
  bg_color: "",
  content: {
    cards: [card],
  },
});

describe("BoxedRow", () => {
  it("does not nest an <a> inside another <a> when a card has both link_url and cta_url", () => {
    const row = makeRow({
      title: "Card title",
      body: "<p>Card body</p>",
      link_url: "/services/",
      cta_url: "/services/book",
      cta_label: "Book now",
    });

    const { container } = render(<BoxedRow row={row} />);

    const anchors = Array.from(container.querySelectorAll("a"));
    expect(anchors.length).toBeGreaterThan(0);
    for (const anchor of anchors) {
      expect(anchor.querySelector("a")).toBeNull();
    }

    // The card-level link is still an <a> to link_url…
    const cardAnchor = container.querySelector('a[href="/services/"]');
    expect(cardAnchor).not.toBeNull();

    // …and the CTA is rendered as a non-anchor (button) with the same
    // styling, still able to navigate to its own cta_url.
    const ctaButton = container.querySelector('button[type="button"]');
    expect(ctaButton).not.toBeNull();
    expect(ctaButton?.textContent).toBe("Book now");
    expect(ctaButton?.className).toContain("btn-ink");
    expect(container.querySelector('a[href="/services/book"]')).toBeNull();
  });

  it("still renders the CTA as an <a> when the card has no link_url", () => {
    const row = makeRow({
      title: "Card title",
      body: "<p>Card body</p>",
      cta_url: "/services/book",
      cta_label: "Book now",
    });

    const { container } = render(<BoxedRow row={row} />);

    const ctaAnchor = container.querySelector('a[href="/services/book"]');
    expect(ctaAnchor).not.toBeNull();
    expect(ctaAnchor?.textContent).toBe("Book now");
    expect(container.querySelector("button")).toBeNull();
  });
});
