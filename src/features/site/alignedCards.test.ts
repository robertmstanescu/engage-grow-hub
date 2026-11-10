import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source-level guards for the owner's layout choices of 10 Nov 2026:
 * cards in a line share their rows, "What's inside" and the Q&A start
 * closed, the tier note prints outside the card and the booking
 * calendar sits under the copy.
 */
const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("aligned cards", () => {
  const tier = read("src/features/site/TierCard.tsx");
  const css = read("src/index.css");

  it("the tier grid and the boxed grid opt in to shared rows", () => {
    expect(read("src/features/site/rows/ServiceRow.tsx")).toMatch(/align-cards/);
    expect(read("src/features/site/rows/BoxedRow.tsx")).toMatch(/align-cards/);
    expect(css).toMatch(/grid-template-rows: subgrid/);
  });

  it("step cards and blog cards share their rows too (owner, 10 Nov 2026)", () => {
    // Bodies in a line start level whatever the title length: a rule for
    // every card grid, not only tiers and boxed cards.
    for (const file of [
      "src/features/site/rows/ProcessStepsRow.tsx",
      "src/pages/Blog.tsx",
      "src/features/widgets/from_the_blog/FromTheBlogRow.tsx",
    ]) {
      const src = read(file);
      expect(src, file).toMatch(/align-cards/);
      expect(src, file).toMatch(/align-card[ "`]/);
    }
  });

  it("the tier card always renders its seven parts, so rows stay in step", () => {
    // Slots: tag, title, price, text, done box, what's inside, button.
    expect(tier).toMatch(/\["--slots" as string\]: 7/);
    // Five of them are optional and fall back to an empty part.
    const article = tier.slice(tier.indexOf("<article"), tier.indexOf("</article>"));
    expect(article.match(/className="align-empty"/g)?.length).toBe(5);
  });

  it("What's inside is a details that starts closed", () => {
    expect(tier).toMatch(/<details className="tier-inside">/);
    expect(tier).not.toMatch(/<details[^>]*\bopen\b/);
  });

  it("the note prints after the card, outside it", () => {
    expect(tier.indexOf("tier-note")).toBeGreaterThan(tier.indexOf("</article>"));
  });
});

describe("Q&A and booking defaults", () => {
  it("answers start closed but stay in the HTML", () => {
    const faq = read("src/features/site/rows/FaqRow.tsx");
    expect(faq).toMatch(/c\.start_open === true \?/);
    expect(faq).toMatch(/forceMount/);
    expect(read("src/index.css")).toMatch(/\.faq-list \[role="region"\]\[data-state="closed"\] \{ display: none; \}/);
  });

  it("the calendar sits beside the copy unless the block says under", () => {
    expect(read("src/features/site/rows/ContactRow.tsx")).toMatch(/const stacked = c\.layout === "stacked";/);
  });
});
