import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import CtaBandRow from "./CtaBandRow";
import type { PageRow } from "@/types/rows";

const row = (content: Record<string, unknown>): PageRow =>
  ({ id: "r1", type: "cta_band", strip_title: "CTA", bg_color: "", content, layout: {} }) as unknown as PageRow;

describe("CtaBandRow, dark rounded band", () => {
  it("draws the band with its label, one-line title and button", () => {
    const { container } = render(
      <CtaBandRow row={row({ band_style: "room", eyebrow: "What to do about it", title_lines: ["Not sure?", '<span class="mc-accent">Lift the lid.</span>'], button_text: "Book", button_url: "/#contact" })} />,
    );
    expect(container.querySelector(".cta-room-eyebrow")?.textContent).toBe("What to do about it");
    expect(container.querySelector(".cta-room-title")?.textContent).toBe("Not sure? Lift the lid.");
    expect(container.querySelector(".cta-room-button")?.getAttribute("href")).toBe("/#contact");
  });

  it("never prints a script link or a pasted script", () => {
    const { container } = render(
      <CtaBandRow row={row({ band_style: "room", title_lines: ['<script>window.__xss=1</script>Hi'], body: '<img src=x onerror="window.__xss=1">', button_text: "Go", button_url: "javascript:window.__xss=1" })} />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).not.toContain("onerror");
    expect(container.querySelector(".cta-room-button")?.getAttribute("href")).not.toContain("javascript:");
  });
});
