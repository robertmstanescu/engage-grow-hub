/** The Work pages' search, answer-engine and llms.txt data (scripts/lib/workSeo.mjs). */
import { workIndexDescription, workItemArticleLd, workItemMeta, workLlmsLines, workReadable } from "../../../scripts/lib/workSeo.mjs";
import { WORK_PORTFOLIO } from "./entries";
import { buildCaseRows, coverPath, ogPath } from "./portfolio";

const origin = "https://example.com";
const abs = (p: string) => `${origin}${p}`;
const ctx = {
  abs,
  absImage: (s: string) => (s ? abs(s) : abs("/og-image.jpg")),
  path: "/work/town-halls/",
  brandName: "The Magic Coffin",
  origin,
  person: { "@id": `${origin}/#founder`, name: "Robert Stănescu", url: abs("/about-us/") },
};

/** A work_items row as Supabase returns it, from the portfolio data. */
const asRow = (e = WORK_PORTFOLIO[0]) => ({
  slug: e.slug,
  title: e.title,
  summary: e.summary,
  type: e.type,
  pillar: e.pillar,
  honesty_label: e.honestyLabel,
  tags: e.tags,
  cover_image: coverPath(e.slug),
  og_image: ogPath(e.slug),
  meta_title: e.metaTitle,
  meta_description: e.metaDescription,
  ai_summary: e.aiSummary,
  case_rows: buildCaseRows(e),
  published_at: "2026-11-24T09:00:00Z",
  updated_at: "2026-11-24T09:00:00Z",
});

describe("work SEO data", () => {
  it("prefers the search title, description and social card", () => {
    const meta = workItemMeta(asRow());
    expect(meta.title).toBe(WORK_PORTFOLIO[0].metaTitle);
    expect(meta.description).toBe(WORK_PORTFOLIO[0].metaDescription);
    expect(meta.image).toBe("/work/town-halls/og.jpg");
  });

  it("ties the piece to its author, its service and the Work collection", () => {
    const ld = workItemArticleLd(asRow(), ctx);
    expect(ld["@type"]).toBe("Article");
    expect(ld.author.name).toBe("Robert Stănescu");
    expect(ld.about).toMatchObject({ "@type": "Service", name: "Internal Communications", url: abs("/services/internal-communications/") });
    expect(ld.isPartOf["@id"]).toBe(abs("/work/"));
    expect(ld.abstract).toContain("South Pole");
    expect(ld.disambiguatingDescription).toBe("Real work, South Pole, 2024 to 2026");
    expect(ld.image).toBe(abs("/work/town-halls/og.jpg"));
  });

  it("reads steps and quotes as body copy for crawlers", () => {
    const r = workReadable(asRow(), { heading: "", paragraphs: [] });
    expect(r.heading).toBe(WORK_PORTFOLIO[0].title);
    expect(r.paragraphs.some((p) => p.startsWith("Counted who came:"))).toBe(true);
    expect(r.paragraphs.some((p) => p.includes("Rachael Odhiambo"))).toBe(true);
  });

  it("lists every piece in llms.txt with its type, service and facts", () => {
    const lines = workLlmsLines(WORK_PORTFOLIO.map(asRow), abs);
    expect(lines).toHaveLength(21);
    expect(lines[0]).toMatch(/^- \[Town Halls people turned up for\]\(https:\/\/example\.com\/work\/town-halls\/\): Case study, Internal Communications\. Case study\./);
  });

  it("describes the index from what is published", () => {
    expect(workIndexDescription([{ pillar: "ic" }, { pillar: "pay" }], "The Magic Coffin")).toBe(
      "The Magic Coffin: case studies, artefacts and playbooks in Internal Communications and Pay Transparency.",
    );
  });

  it("survives empty data", () => {
    expect(workItemMeta({}).title).toBe("");
    expect(workItemArticleLd({}, { ...ctx, person: null }).author).toBeUndefined();
    expect(workLlmsLines([null as never, {}], abs)).toEqual([]);
  });
});
