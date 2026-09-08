import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RowTitle, RowEyebrow, RowSubtitle, RowBody, RowNote } from "..";
import BoxedRow from "../../BoxedRow";
import { parseWidgetContent } from "@/lib/WidgetRegistry";
import { getWidget } from "@/widgets";
import type { PageRow } from "@/types/rows";

/**
 * Rows adapt their text to the background: RowSection publishes
 * `--row-fg` (light on dark bands, dark on light ones) and every
 * typography primitive falls back to it unless the admin set a colour.
 *
 * Regression: "" must count as "no colour set". A cleared colour picker
 * stores "", and schema-backed rows fill unset colours with "". Using
 * `??` applied the empty string, which is invalid CSS, so the text
 * inherited the section's static colour instead of adapting.
 *
 * Rendered to static markup on purpose: jsdom's CSS parser drops
 * `var(...)` colour values from `style`, so a DOM render cannot tell
 * "adaptive" from "no colour at all". The server markup keeps the
 * literal `color:var(--row-fg, …)` declaration.
 */
const html = (node: React.ReactElement) => renderToStaticMarkup(node);
/** The style="" attribute of the first element with the given tag/selector-ish start. */
const styleOfTag = (markup: string, tag: string, attrHint = "") => {
  const re = new RegExp(`<${tag}[^>]*${attrHint}[^>]*style="([^"]*)"`);
  return re.exec(markup)?.[1] ?? "";
};

describe("row typography colour fallback", () => {
  it.each([
    ["RowTitle", <RowTitle color="">t</RowTitle>, "h2"],
    ["RowEyebrow", <RowEyebrow color="">e</RowEyebrow>, "span"],
    ["RowSubtitle", <RowSubtitle color="">s</RowSubtitle>, "p"],
    ["RowBody", <RowBody color="">b</RowBody>, "div"],
    ["RowNote", <RowNote color="">n</RowNote>, "p"],
  ] as const)("%s treats an empty colour as unset and adapts via --row-fg", (_name, node, tag) => {
    expect(styleOfTag(html(node), tag)).toContain("var(--row-fg");
  });

  it("still honours an explicit admin colour", () => {
    const style = styleOfTag(html(<RowTitle color="#c00">t</RowTitle>), "h2");
    expect(style).toContain("color:#c00");
    expect(style).not.toContain("--row-fg");
  });

  it("a schema-defaulted boxed row (colour fields filled with \"\") keeps adaptive text", () => {
    const def = getWidget("boxed")!;
    const content = parseWidgetContent(def, { title_lines: ["Hello"], eyebrow: "Eyebrow", subtitle: "Sub" }, "r1");
    expect(content.color_title).toBe("");
    const row: PageRow = { id: "r1", type: "boxed", strip_title: "", bg_color: "", content };
    const markup = html(<BoxedRow row={row} />);
    expect(styleOfTag(markup, "h2")).toContain("var(--row-fg");
    expect(styleOfTag(markup, "span", 'data-row-part="eyebrow"')).toContain("var(--row-fg");
  });
});
