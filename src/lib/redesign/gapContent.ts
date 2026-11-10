/**
 * Gap content: sections the design has and the live site did not.
 * Kept apart from `restyle.ts` so that file's "no words changed" proof
 * stays strict. Everything added here is NEW on the page, approved in
 * principle by the owner ("fill the gaps"), and listed for his review
 * by `scripts/redesign/build-restyle.ts` (gap-content.txt).
 *
 * Three kinds of gap, in order of how much is new:
 *   1. Re-used copy: text the owner already wrote, shown in one more
 *      place (the "In short" strip shows the hero's plain answer; a
 *      service page's contact block repeats the homepage's; the hero
 *      badge names the page's own first tier).
 *   2. Button labels: "Book a free consultation" and one arrow link.
 *   3. New copy: the homepage proof strip. Its four numbers are the ones
 *      already published on the site (About page and homepage cards).
 *
 * Voice rules for anything written here (The Magic Coffin selling copy):
 * plain short sentences, no negation words, no competitor comparisons,
 * no em dashes, British spelling.
 *
 * Every function is idempotent: running it on rows that already carry
 * the gap content changes nothing, and nothing the owner has since
 * filled in is overwritten.
 */
import type { RestyleContext } from "./restyle";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

export interface GapContext extends RestyleContext {
  /** The homepage rows, so other pages can repeat its contact block. */
  homeRows?: Json[];
}

/** One line of the review list: where, which field, what was added. */
export interface GapNote {
  where: string;
  field: string;
  value: string;
  kind: "reused" | "label" | "new";
}

const BOOK_LABEL = "Book a free consultation";
const SERVICES_LABEL = "See the six services";
const BADGE_LABEL = "Start with";

export const HOME_PROOF = {
  eyebrow: "Before the coffin, the in-house record",
  items: [
    { value: "36", label: "countries on one internal comms function" },
    { value: "300K+", label: "internal page views in a single year" },
    { value: "~60%", label: "average live town hall attendance" },
    { value: "~300", label: "new hires onboarded through one programme" },
  ],
};

const widgetsOf = (row: Json): Json[] =>
  (Array.isArray(row?.columns) ? row.columns : []).flatMap((col: Json) =>
    (Array.isArray(col?.cells) ? col.cells : []).flatMap((cell: Json) => (Array.isArray(cell?.widgets) ? cell.widgets : [])),
  );

const firstWidget = (rows: Json[], type: string): Json | undefined => {
  for (const row of rows) for (const w of widgetsOf(row)) if (w?.type === type) return w;
  return undefined;
};
const rowIndexOf = (rows: Json[], type: string): number =>
  rows.findIndex((row) => widgetsOf(row).some((w) => w?.type === type));

const blank = (value: unknown): boolean => typeof value !== "string" || !value.trim();

/** A v3 row holding one widget, shaped like the rows the builder saves. */
const makeRow = (id: string, stripTitle: string, type: string, data: Json): Json => ({
  id,
  schema_version: 3,
  strip_title: stripTitle,
  bg_color: "",
  column_layout: "custom",
  customCss: null,
  scope: null,
  layout: { alignment: "left", columns: 1, fullWidth: false, marginTop: 0, marginBottom: 0, paddingTop: 56, paddingBottom: 56, snapEnabled: false },
  columns: [
    {
      id: `${id}-col`,
      cell_direction: "vertical",
      cells: [
        {
          id: `${id}-cell`,
          span: { col: 1, row: 1 },
          layout: { direction: "vertical", gap: 24, justify: "stretch", minHeight: 0, paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, verticalAlign: "top" },
          style: { bgColor: "", borderColor: "", borderRadius: 0, borderWidth: 0, customClass: "", customCss: "" },
          widgets: [{ id: `${id}-widget`, type, data }],
        },
      ],
    },
  ],
});

/** Set a field only when the owner has left it empty; note what was set. */
const fill = (data: Json, field: string, value: string, where: string, kind: GapNote["kind"], notes: GapNote[]): void => {
  if (!blank(data[field]) || blank(value)) return;
  data[field] = value;
  notes.push({ where, field, value, kind });
};

const homeGaps = (rows: Json[], notes: GapNote[]): Json[] => {
  const hero = firstWidget(rows, "hero");
  if (hero) {
    const data = hero.data || (hero.data = {});
    // A label without its link (or the reverse) renders nothing: fill the pair together.
    if (blank(data.cta_label) && blank(data.cta_url)) {
      fill(data, "cta_label", BOOK_LABEL, "Home hero, main button", "label", notes);
      data.cta_url = "#contact";
    }
    if (blank(data.secondary_cta_label) && blank(data.secondary_cta_url)) {
      fill(data, "secondary_cta_label", SERVICES_LABEL, "Home hero, arrow link", "label", notes);
      data.secondary_cta_url = "/services/";
    }
  }

  // Proof strip, straight under the hero. Skipped when the page already has one.
  if (rowIndexOf(rows, "proof_band") < 0) {
    const heroAt = rowIndexOf(rows, "hero");
    const proof = makeRow("gap-home-proof", "Proof strip", "proof_band", {
      eyebrow: HOME_PROOF.eyebrow,
      title_lines: [],
      body: "",
      items: HOME_PROOF.items.map((item) => ({ ...item })),
      band_style: "deep",
    });
    rows = [...rows.slice(0, heroAt + 1), proof, ...rows.slice(heroAt + 1)];
    notes.push({ where: "Home, new proof strip under the hero", field: "eyebrow", value: HOME_PROOF.eyebrow, kind: "new" });
    for (const item of HOME_PROOF.items) {
      notes.push({ where: "Home, new proof strip under the hero", field: "item", value: `${item.value} ${item.label}`, kind: "new" });
    }
  }
  return rows;
};

const serviceGaps = (rows: Json[], ctx: GapContext, notes: GapNote[]): Json[] => {
  const page = `/${["services", ctx.pillarSlug].filter(Boolean).join("/")}`;
  const hero = firstWidget(rows, "hero");
  const tiers = firstWidget(rows, "service");
  if (hero) {
    const data = hero.data || (hero.data = {});
    if (blank(data.cta_label) && blank(data.cta_url)) {
      fill(data, "cta_label", BOOK_LABEL, `${page} hero, main button`, "label", notes);
      data.cta_url = "/#contact";
    }
    // "In short": the hero's own plain answer, shown under the hero as well as in the footer.
    if (!blank(data.answer) && data.answer_strip !== true) {
      data.answer_strip = true;
      notes.push({ where: `${page}, "In short" strip under the hero`, field: "answer (already written)", value: String(data.answer).trim(), kind: "reused" });
    }
    // Photo badge: the page's own first tier, with its own name and price.
    const first = Array.isArray(tiers?.data?.services) ? tiers.data.services[0] : undefined;
    if (first && !blank(first.title) && blank(data.visual_badge_title) && blank(data.visual_badge_text) && !blank(data.visual_image_url)) {
      const price = String(first.time || "").split("·")[0].trim();
      const text = [String(first.subtitle || "").trim(), price].filter(Boolean).join(" · ");
      data.visual_badge_label = BADGE_LABEL;
      data.visual_badge_title = String(first.title).trim();
      data.visual_badge_text = text;
      notes.push({ where: `${page} hero, badge on the photo`, field: "badge", value: `${BADGE_LABEL} / ${data.visual_badge_title} / ${text}`, kind: "reused" });
    }
  }

  // Contact block: repeat the homepage's, word for word, as the last row.
  const homeContactRow = (ctx.homeRows || []).find((row) => widgetsOf(row).some((w) => w?.type === "contact"));
  if (homeContactRow && rowIndexOf(rows, "contact") < 0) {
    const copy: Json = JSON.parse(JSON.stringify(homeContactRow));
    const slug = ctx.pillarSlug || "service";
    copy.id = `gap-contact-${slug}`;
    for (const col of copy.columns || []) {
      col.id = `${copy.id}-col`;
      for (const cell of col.cells || []) {
        cell.id = `${copy.id}-cell`;
        for (const w of cell.widgets || []) w.id = `${copy.id}-widget`;
      }
    }
    rows = [...rows, copy];
    notes.push({ where: `${page}, contact block at the foot of the page`, field: "whole block", value: "Same words as the homepage contact block", kind: "reused" });
  }
  return rows;
};

/**
 * Add the gap content for one page. Returns new rows; `notes`, when
 * given, collects a plain list of everything that was added.
 */
export const applyGapContent = (rows: Json[], ctx: GapContext, notes: GapNote[] = []): Json[] => {
  if (!Array.isArray(rows)) return [];
  const copy: Json[] = JSON.parse(JSON.stringify(rows));
  if (ctx.kind === "home") return homeGaps(copy, notes);
  if (ctx.kind === "service") return serviceGaps(copy, ctx, notes);
  return copy;
};
