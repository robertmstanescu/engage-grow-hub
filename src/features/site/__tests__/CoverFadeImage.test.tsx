import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CoverFadeImage from "../CoverFadeImage";
import { FADE_GRADIENTS } from "../coverFade";
import RowCoverImage from "../rows/RowCoverImage";
import RowCoverCard from "../RowCoverCard";
import type { PageRow } from "@/types/rows";

/**
 * The cover fade: which gradient each caller gets, and that the mask is
 * on the visible box (the element with data-cover-fade), not the <img>,
 * so a height-capped cover still reaches 0% at its visible bottom edge.
 * Static markup keeps the literal mask declaration (jsdom drops it).
 */
const fadeBox = (markup: string) => /<div[^>]*data-cover-fade="([a-z]+)"[^>]*style="([^"]*)"/.exec(markup);
const imgStyle = (markup: string) => /<img[^>]*style="([^"]*)"/.exec(markup)?.[1] ?? "";

const row = (content: Record<string, unknown>, layout?: PageRow["layout"]): PageRow => ({
  id: "r", type: "text", strip_title: "", bg_color: "", content, layout,
});

describe("CoverFadeImage", () => {
  it("defaults to the banner-style hold fade, on the visible box", () => {
    const m = fadeBox(renderToStaticMarkup(<CoverFadeImage src="https://x/y.jpg" alt="a" />));
    expect(m?.[1]).toBe("hold");
    expect(m?.[2]).toContain("rgba(0,0,0,1) 45%");
    expect(imgStyle(renderToStaticMarkup(<CoverFadeImage src="https://x/y.jpg" alt="a" />))).not.toContain("mask");
  });

  it("linear fades 100% → 0% with no hold", () => {
    const m = fadeBox(renderToStaticMarkup(<CoverFadeImage src="https://x/y.jpg" alt="a" fade="linear" />));
    expect(m?.[2]).toContain(FADE_GRADIENTS.linear);
    expect(FADE_GRADIENTS.linear).not.toContain("45%");
  });

  it("row-level covers use the linear fade", () => {
    const m = fadeBox(renderToStaticMarkup(<RowCoverImage src="https://x/y.jpg" alt="a" layout={{ coverImage: "https://x/y.jpg" } as PageRow["layout"]} />));
    expect(m?.[1]).toBe("linear");
  });

  it("flush cover cards use linear; the FAQ card keeps hold", () => {
    const r = row({ cover_image: "https://x/y.jpg", cover_image_alt: "a" });
    expect(fadeBox(renderToStaticMarkup(<RowCoverCard row={r}>x</RowCoverCard>))?.[1]).toBe("linear");
    expect(fadeBox(renderToStaticMarkup(<RowCoverCard row={r} variant="card">x</RowCoverCard>))?.[1]).toBe("hold");
  });
});
