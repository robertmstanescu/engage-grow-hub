/**
 * llms.txt (search plan US09). It opens with the company definition word
 * for word, then the founder, where the company is and how to book, then
 * every page with its plain summary. Pure; used by scripts/prerender-seo.mjs
 * and tested in src/lib/seo/llmsTxt.test.ts.
 */
import { COMPANY_DEFINITION } from "./entityGraph.mjs";

const oneLine = (v, max = 400) => {
  const s = String(v ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
};

/**
 * input: { brandName, founderName, city, country, bookingUrl, sections }
 * sections: [{ title, entries: [{ title, url, summary }] }] or { title, lines: string[] }
 */
export function buildLlmsTxt({ brandName, founderName, city = "Stockholm", country = "Sweden", bookingUrl, sections = [] }) {
  const out = [`# ${oneLine(brandName) || "The Magic Coffin"}`, "", `> ${COMPANY_DEFINITION}`, ""];
  const facts = [];
  if (founderName) facts.push(`Founded and run by ${oneLine(founderName)}.`);
  facts.push(`Based in ${city}, ${country}, working remotely with teams in any time zone.`);
  if (bookingUrl) facts.push(`Book a free 30-minute call: ${bookingUrl}`);
  out.push(...facts.map((f) => `- ${f}`), "");
  for (const section of sections) {
    const lines = Array.isArray(section.lines)
      ? section.lines
      : (section.entries || [])
          .filter((e) => e && e.title && e.url)
          .map((e) => {
            const summary = oneLine(e.summary);
            return `- [${oneLine(e.title, 160)}](${e.url})${summary ? `: ${summary}` : ""}`;
          });
    if (!lines.length) continue;
    out.push(`## ${section.title}`, "", ...lines, "");
  }
  return `${out.join("\n").replace(/\n+$/, "")}\n`;
}
