/**
 * The text block's optional fold (owner, 25 Nov 2026): body, a CLOSED
 * <details> holding folded_body under fold_label, then body_after. The
 * folded words must be in the HTML (prerender, search, AI tools read
 * them) and a block without a fold renders exactly as before.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TextRow from "../TextRow";
import { isTextRowEmpty } from "../textRowContent";
import type { PageRow } from "@/types/rows";

const row = (content: Record<string, unknown>): PageRow =>
  ({ id: "r", type: "text", strip_title: "Text", bg_color: "", layout: {}, content }) as unknown as PageRow;

describe("text block fold", () => {
  it("renders body, a closed fold with its label, then the text after it", () => {
    const { container } = render(
      <TextRow row={row({ body: "<p>One</p>", fold_label: "Read the whole story", folded_body: "<p>Two</p>", body_after: "<p>Three</p>" })} rowIndex={0} />,
    );
    const details = container.querySelector("details.text-fold") as HTMLDetailsElement;
    expect(details).not.toBeNull();
    expect(details.open).toBe(false);
    expect(details.querySelector("summary")?.textContent).toContain("Read the whole story");
    expect(details.textContent).toContain("Two");
    const text = container.textContent || "";
    expect(text.indexOf("One")).toBeLessThan(text.indexOf("Two"));
    expect(text.indexOf("Two")).toBeLessThan(text.indexOf("Three"));
  });

  it("leaves a block without a fold unchanged", () => {
    const { container } = render(<TextRow row={row({ body: "<p>Only</p>" })} rowIndex={0} />);
    expect(container.querySelector("details")).toBeNull();
    expect(container.querySelector('[data-row-part="body_after"]')).toBeNull();
  });

  it("counts folded text as content", () => {
    expect(isTextRowEmpty(row({ folded_body: "<p>Inside</p>" }))).toBe(false);
    expect(isTextRowEmpty(row({ fold_label: "Open", folded_body: "<p></p>" }))).toBe(true);
  });
});
