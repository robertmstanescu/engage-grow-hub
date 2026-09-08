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

  /**
   * Per-card accent colour: colours the title and draws a 3px top border.
   * The card is the element that carries the border, so find it via the
   * title's closest ancestor with a `boxed-lift` class.
   */
  const cardOf = (container: HTMLElement) =>
    container.querySelector("p")?.closest(".boxed-lift") as HTMLElement | null;

  it("applies accent_color to the card title and top border", () => {
    const { container } = render(
      <BoxedRow row={makeRow({ title: "Accent", body: "<p>x</p>", accent_color: "#c00" })} />,
    );
    const title = container.querySelector("p") as HTMLElement;
    expect(title.style.color).toBe("rgb(204, 0, 0)");
    expect(cardOf(container)?.style.borderTop).toBe("3px solid #c00");
  });

  it("keeps the accent top border on cover-image rows (border shorthand must not wipe it)", () => {
    const row = makeRow({ title: "Accent", body: "<p>x</p>", accent_color: "#c00" });
    row.content.cover_image = "https://example.com/cover.jpg";
    const { container } = render(<BoxedRow row={row} />);
    const card = cardOf(container);
    expect(card?.style.borderTop).toBe("3px solid #c00");
    // the cover-image card chrome is still there
    expect(card?.style.borderRadius).toBe("1rem");
  });

  it("lets a pillar link win over an explicit accent_color", () => {
    const { container } = render(
      <BoxedRow
        row={makeRow({ title: "EX", body: "<p>x</p>", link_url: "/services/employee-experience", accent_color: "#c00" })}
      />,
    );
    // employee-experience pillar navy, not the card's own red
    expect(cardOf(container)?.style.borderTop).toBe("3px solid #002B67");
  });

  it("treats a whitespace-only accent_color as unset and falls back to the row colour", () => {
    const row = makeRow({ title: "Blank", body: "<p>x</p>", accent_color: "   " });
    row.content.color_card_title = "#123456";
    const { container } = render(<BoxedRow row={row} />);
    const title = container.querySelector("p") as HTMLElement;
    expect(title.style.color).toBe("rgb(18, 52, 86)");
    expect(cardOf(container)?.style.borderTop).toBe("");
  });
});
