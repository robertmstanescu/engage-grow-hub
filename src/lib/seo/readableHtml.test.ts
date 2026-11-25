/**
 * The server copy carries the whole page text (search plan US02, US06):
 * headings, every text block, Q&A, cards, prices, quotes and internal
 * links, all escaped, with nothing a crawler should not follow.
 */
import { describe, it, expect } from "vitest";
import {
  decodeEntities,
  htmlToBlocks,
  linkListHtml,
  readableMain,
  rowsHeading,
  rowsToHtml,
  safeHref,
} from "../../../scripts/lib/readableHtml.mjs";
import { WORK_PORTFOLIO } from "@/lib/work/entries";
import { buildCaseRows } from "@/lib/work/portfolio";

const plain = (html: string) => decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");

describe("htmlToBlocks", () => {
  it("keeps headings, paragraphs, lists and safe links", () => {
    const html = htmlToBlocks(
      '<h2>Why</h2><p>Read <strong>the</strong> <a href="/work/town-halls/" style="x">case</a> now.</p><ul><li>One</li><li>Two</li></ul>',
    );
    expect(html).toBe(
      '<h2>Why</h2>\n<p>Read the <a href="/work/town-halls/">case</a> now.</p>\n<ul>\n<li>One</li>\n<li>Two</li>\n</ul>',
    );
  });

  it("drops scripts, styles, unsafe links and every attribute", () => {
    const html = htmlToBlocks(
      '<p onclick="x">Hi <a href="javascript:alert(1)">there</a></p><script>alert(1)</script><style>p{}</style>',
    );
    expect(html).toBe("<p>Hi there</p>");
  });

  it("escapes text and decodes entities once", () => {
    expect(htmlToBlocks("<p>Pay &amp; rewards &lt;b&gt;</p>")).toBe("<p>Pay &amp; rewards &lt;b&gt;</p>");
  });

  it("wraps loose text in a paragraph", () => {
    expect(htmlToBlocks("Just words")).toBe("<p>Just words</p>");
  });
});

describe("safeHref", () => {
  it("allows site paths, https and mail only", () => {
    expect(safeHref("/p/privacy-policy/")).toBe("/p/privacy-policy/");
    expect(safeHref("https://example.com/a")).toBe("https://example.com/a");
    expect(safeHref("//evil.com")).toBe("");
    expect(safeHref("http://example.com")).toBe("");
    expect(safeHref("data:text/html,x")).toBe("");
  });
});

describe("rowsToHtml", () => {
  it("prints every text block, card, price, Q&A and button of a page", () => {
    const rows = [
      { type: "hero", content: { eyebrow: "Services", title_lines: ["Internal", "<em>comms</em>"], subtitle: "For scale-ups.", answer: "A plain answer.", cta_label: "Book a call", cta_url: "/contact/" } },
      {
        id: "r2",
        columns: [
          {
            cells: [
              {
                widgets: [
                  { type: "boxed", data: { title: "Tiers", cards: [{ title: "Starter", price: "€900", description: "<p>Two days.</p>", deliverables: ["Audit", "Plan"] }] } },
                ],
              },
            ],
          },
        ],
      },
      { type: "faq", content: { title_lines: ["Questions"], items: [{ question: "How long?", answer: "<p>Six weeks.</p>" }] } },
      { type: "spacer", content: { height: 40 } },
    ];
    const html = rowsToHtml(rows);
    const text = plain(html);
    for (const words of ["Services", "Internal comms", "For scale-ups.", "A plain answer.", "Book a call", "Tiers", "Starter", "€900", "Two days.", "Audit", "Plan", "How long?", "Six weeks."]) {
      expect(text).toContain(words);
    }
    expect(html).toContain('<a href="/contact/">Book a call</a>');
    expect(html).toContain("<h3>How long?</h3>");
    expect(rowsHeading(rows)).toBe("Internal comms");
  });

  it("does not print colours, ids or picture addresses", () => {
    const html = rowsToHtml([{ type: "text", content: { title: "Hi", color_title: "#fff", id: "abc", image_url: "https://x/y.png" } }]);
    expect(html).toBe("<h2>Hi</h2>");
  });

  it("carries a sentence from deep inside a case study", () => {
    const entry = WORK_PORTFOLIO.find((e) => e.slug === "town-halls") ?? WORK_PORTFOLIO[0];
    const rows = buildCaseRows(entry);
    const text = plain(rowsToHtml(rows));
    // The last paragraph of the last text section, and the last FAQ answer.
    const textSections = entry.sections.filter((s) => s.kind === "text");
    const deep = textSections[textSections.length - 1];
    if (deep?.kind === "text") {
      const sentence = plain(deep.paras[deep.paras.length - 1].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")).trim();
      expect(text).toContain(sentence);
    }
    if (entry.faq.length) {
      const last = entry.faq[entry.faq.length - 1];
      expect(text).toContain(last.q);
      expect(text).toContain(plain(last.a.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")).trim());
    }
  });
});

describe("index pages", () => {
  it("lists every entry as a link with its summary", () => {
    const html = linkListHtml([
      { href: "/blog/a/", title: "Post A", summary: "About A" },
      { href: "javascript:x", title: "Bad" },
    ]);
    expect(html).toBe('<ul>\n<li><a href="/blog/a/">Post A</a>: About A</li>\n</ul>');
  });

  it("opens with one h1 and does not repeat it as an h2", () => {
    expect(readableMain("Work", ["<h2>Work</h2>\n<p>Intro</p>", ""])).toBe("<h1>Work</h1>\n<p>Intro</p>");
    expect(readableMain("", [])).toBe("");
  });
});
