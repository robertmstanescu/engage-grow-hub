import type { PageRow } from "@/types/rows";

/**
 * The /work index's own words, kept in site content `work_page` and
 * edited under Admin ▸ Pages ▸ Work (owner, 25 Nov 2026). The cards
 * themselves come from the work items; this is the header, the plain
 * answer, the search fields and any rows placed above or below the cards.
 */
export interface WorkPageContent {
  header_label: string;
  header_title: string;
  header_subtitle: string;
  /** One or two plain sentences: what the page is, for whom, how. Printed under "In plain words" in the footer. */
  answer: string;
  meta_title: string;
  meta_description: string;
  /** Small label over the self-scrolling top three under the header. */
  featured_label: string;
  /** Slugs of the top three pieces, in order; empty = no featured band. */
  featured_slugs: string[];
  rows_above: PageRow[];
  rows_below: PageRow[];
}

/** How many pieces the featured band shows. */
export const FEATURED_MAX = 3;

export const WORK_PAGE_KEY = "work_page";

export const WORK_PAGE_DEFAULTS: WorkPageContent = {
  header_label: "The work",
  header_title: "The work, with the lid off.",
  header_subtitle:
    "Real work from in-house roles, sample deliverables and how we would tackle the problems scale-ups keep calling about. Every piece carries a label that says what it is.",
  answer:
    "Case studies, artefacts and playbooks by Robert Stănescu, founder of The Magic Coffin, in internal communications, employee experience, people operations, HR business partnering, pay transparency and manager enablement. Each piece says whether it is real work from South Pole or Klarna, a recreation with dummy data or an illustrative playbook.",
  meta_title: "",
  meta_description: "",
  featured_label: "Start with these three",
  // The three real cases with the strongest measured results (25 Nov 2026);
  // the owner changes them under Admin, Pages, Work.
  featured_slugs: ["town-halls", "onboarding-buddy-programme", "enps-programme"],
  rows_above: [],
  rows_below: [],
};

/** Merge stored content over the defaults; anything missing or malformed falls back. */
export const readWorkPage = (raw: unknown): WorkPageContent => {
  const c = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const text = (k: keyof WorkPageContent) =>
    typeof c[k] === "string" ? (c[k] as string) : (WORK_PAGE_DEFAULTS[k] as string);
  const rows = (k: "rows_above" | "rows_below") => (Array.isArray(c[k]) ? (c[k] as PageRow[]) : []);
  // Never saved = the defaults; saved = exactly what was saved (clean strings, no repeats, at most three).
  const featured = Array.isArray(c.featured_slugs)
    ? [...new Set((c.featured_slugs as unknown[]).filter((v): v is string => typeof v === "string" && v.trim() !== "").map((v) => v.trim()))].slice(0, FEATURED_MAX)
    : WORK_PAGE_DEFAULTS.featured_slugs;
  return {
    header_label: text("header_label"),
    header_title: text("header_title") || WORK_PAGE_DEFAULTS.header_title,
    header_subtitle: text("header_subtitle"),
    answer: text("answer"),
    meta_title: text("meta_title"),
    meta_description: text("meta_description"),
    featured_label: text("featured_label"),
    featured_slugs: featured,
    rows_above: rows("rows_above"),
    rows_below: rows("rows_below"),
  };
};
