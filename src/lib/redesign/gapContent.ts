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
import { visibleText } from "./restyle";
import type { RestyleContext } from "./restyle";
import { OWNER_MAP_COPY, OWNER_MAP_LIST } from "@/features/widgets/world_map/ownerList";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

export interface GapContext extends RestyleContext {
  /** The homepage rows, so other pages can repeat its contact block. */
  homeRows?: Json[];
  /** Rows of every service page by slug, so the Services index can
   *  print each pillar's own tier names and starting price. */
  serviceRows?: Record<string, Json[]>;
}

/** One line of the review list: where, which field, what was added. */
export interface GapNote {
  where: string;
  field: string;
  value: string;
  kind: "reused" | "label" | "new";
}

const BOOK_LABEL = "Book a free consultation";
/** Small labels from the Main artboard. */
/** Small labels from the service artboards. */
export const SERVICE_LABELS = {
  tiers: "Engagements",
  tiersIntro: "Every engagement starts with a free 30-minute call, where you get a straight answer including an honest read on fit.",
  startHere: "start here",
  blog: "Latest thinking",
};
export const HOME_LABELS = { vows: "Our vows", fix: "The fix", stamp: "Lid off" };
const SERVICES_LABEL = "See the six services";
const BADGE_LABEL = "Start with";

/* Wording from the homepage artboard ("Track record" band). */
export const HOME_PROOF = {
  eyebrow: "Before the coffin: the in-house record",
  items: [
    { value: "36", label: "countries run from one comms function" },
    { value: "300K+", label: "internal page views a year" },
    { value: "~60%", label: "average live Town Hall attendance" },
    { value: "~300", label: "new hires through a rebuilt Buddy Programme" },
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

  // World map, straight under the proof strip (design: Main artboard).
  // The countries are the owner's own list; the copy is the artboard's.
  if (rowIndexOf(rows, "world_map") < 0) {
    const after = Math.max(rowIndexOf(rows, "proof_band"), rowIndexOf(rows, "hero"));
    const where = "Home, new world map under the proof strip";
    const map = makeRow("gap-home-world-map", "World map", "world_map", {
      eyebrow: OWNER_MAP_COPY.eyebrow,
      title_lines: [...OWNER_MAP_COPY.title_lines],
      lede: OWNER_MAP_COPY.lede,
      legend_note: OWNER_MAP_COPY.legend_note,
      worked: [...OWNER_MAP_LIST.worked],
      hr: [...OWNER_MAP_LIST.hr],
      main: [...OWNER_MAP_LIST.main],
    });
    rows = [...rows.slice(0, after + 1), map, ...rows.slice(after + 1)];
    notes.push({ where, field: "eyebrow", value: OWNER_MAP_COPY.eyebrow, kind: "new" });
    notes.push({ where, field: "title", value: OWNER_MAP_COPY.title_lines.join(" "), kind: "new" });
    notes.push({ where, field: "intro", value: OWNER_MAP_COPY.lede, kind: "new" });
    notes.push({ where, field: "legend note", value: OWNER_MAP_COPY.legend_note, kind: "new" });
  }
  /* Small labels the artboard draws and the page never had: the label
     over the vows, "The fix" over the cards that answer "The problem",
     and the stamp under the closing headline. */
  for (const row of rows) {
    for (const w of widgetsOf(row)) {
      const data = w.data || (w.data = {});
      if (w.type === "boxed" && Array.isArray(data.cards)) {
        const titles = data.cards.map((c: Json) => String(c?.title || "").trim().toLowerCase());
        if (/vow/i.test(String(row.strip_title || "")) && blank(data.eyebrow)) fill(data, "eyebrow", HOME_LABELS.vows, "Home, vows", "label", notes);
        if (titles.includes("the problem") && blank(data.group_label)) fill(data, "group_label", HOME_LABELS.fix, "Home, problem and fix", "label", notes);
      }
      if (w.type === "contact" && blank(data.stamp)) fill(data, "stamp", HOME_LABELS.stamp, "Home, contact block", "label", notes);
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

  /* Small labels and one line the service artboards draw. The line under
     "What we can help with" and the one under the FAQ heading are the
     site's own words, taken from the homepage FAQ. */
  if (tiers) {
    const data = tiers.data || (tiers.data = {});
    if (blank(data.eyebrow)) fill(data, "eyebrow", SERVICE_LABELS.tiers, `${page}, engagements`, "label", notes);
    if (blank(visibleText(data.description))) {
      data.description = `<p>${SERVICE_LABELS.tiersIntro}</p>`;
      notes.push({ where: `${page}, engagements`, field: "intro (from the homepage FAQ)", value: SERVICE_LABELS.tiersIntro, kind: "reused" });
    }
    const first = Array.isArray(data.services) ? data.services[0] : undefined;
    if (first && blank(first.startHere)) fill(first, "startHere", SERVICE_LABELS.startHere, `${page}, first engagement card`, "label", notes);
  }
  const faq = firstWidget(rows, "faq");
  if (faq) {
    const data = faq.data || (faq.data = {});
    if (blank(data.eyebrow)) fill(data, "eyebrow", "FAQ", `${page}, FAQ`, "label", notes);
    const homeFaq = firstWidget(ctx.homeRows || [], "faq");
    const line = String(homeFaq?.data?.subtitle || "").trim();
    if (blank(data.subtitle) && line) {
      data.subtitle = line;
      notes.push({ where: `${page}, FAQ`, field: "line under the heading (from the homepage FAQ)", value: line, kind: "reused" });
    }
  }
  const blog = firstWidget(rows, "from_the_blog");
  if (blog && blank((blog.data || (blog.data = {})).eyebrow)) fill(blog.data, "eyebrow", SERVICE_LABELS.blog, `${page}, blog row`, "label", notes);
  return withHomeContact(rows, ctx, ctx.pillarSlug || "service", page, notes);
};

/**
 * About (artboard About): the hero's intro is the page's own plain
 * answer, the main button books the call and the contact block carries
 * the stamp. Nothing here is new copy except the two labels.
 */
const aboutGaps = (rows: Json[], notes: GapNote[]): Json[] => {
  const page = "/about-us";
  const hero = firstWidget(rows, "hero");
  if (hero) {
    const data = hero.data || (hero.data = {});
    if (blank(visibleText(data.body)) && !blank(data.answer)) {
      data.body = `<p>${String(data.answer).trim().replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`;
      notes.push({ where: `${page} hero, intro`, field: "plain answer (already written)", value: String(data.answer).trim(), kind: "reused" });
    }
    if (blank(data.cta_label) && blank(data.cta_url)) {
      fill(data, "cta_label", BOOK_LABEL, `${page} hero, main button`, "label", notes);
      data.cta_url = "#contact";
    }
  }
  const contact = firstWidget(rows, "contact");
  if (contact && blank((contact.data || (contact.data = {})).stamp)) fill(contact.data, "stamp", HOME_LABELS.stamp, `${page}, contact block`, "label", notes);
  return rows;
};

/** Contact block: repeat the homepage's, word for word, as the last row. */
const withHomeContact = (rows: Json[], ctx: GapContext, slug: string, page: string, notes: GapNote[]): Json[] => {
  const homeContactRow = (ctx.homeRows || []).find((row) => widgetsOf(row).some((w) => w?.type === "contact"));
  if (!homeContactRow || rowIndexOf(rows, "contact") >= 0) return rows;
  const copy: Json = JSON.parse(JSON.stringify(homeContactRow));
  copy.id = `gap-contact-${slug}`;
  for (const col of copy.columns || []) {
    col.id = `${copy.id}-col`;
    for (const cell of col.cells || []) {
      cell.id = `${copy.id}-cell`;
      for (const w of cell.widgets || []) w.id = `${copy.id}-widget`;
    }
  }
  notes.push({ where: `${page}, contact block at the foot of the page`, field: "whole block", value: "Same words as the homepage contact block", kind: "reused" });
  return [...rows, copy];
};

/**
 * Services index (artboard Services): the hero button, each pillar's own
 * tier names and starting price beside it, and the contact block.
 * Every word is already on the site; nothing here is new copy.
 */
const servicesIndexGaps = (rows: Json[], ctx: GapContext, notes: GapNote[]): Json[] => {
  const page = "/services";
  const hero = firstWidget(rows, "hero");
  if (hero) {
    const data = hero.data || (hero.data = {});
    if (blank(data.cta_label) && blank(data.cta_url)) {
      fill(data, "cta_label", BOOK_LABEL, `${page} hero, main button`, "label", notes);
      data.cta_url = "#contact";
    }
  }
  for (const w of rows.flatMap(widgetsOf)) {
    if (w?.type !== "boxed" || w.data?.layout_mode !== "list" || !Array.isArray(w.data.cards)) continue;
    for (const card of w.data.cards) {
      const slug = String(card?.link_url || "").replace(/^\/+|\/+$/g, "");
      const tiers = firstWidget(ctx.serviceRows?.[slug] || [], "service")?.data?.services;
      if (!Array.isArray(tiers) || !tiers.length) continue;
      const names = tiers.map((t: Json) => String(t?.title || "").trim()).filter(Boolean);
      const price = String(tiers[0]?.time || "").split("·")[0].trim().replace(/^from\s+/i, "");
      if (blank(card.meta) && names.length) card.meta = names.join(" · ");
      if (blank(card.price) && price && names.length) {
        card.price = price;
        card.price_note = `start with ${names[0]}, from`;
      }
      notes.push({ where: `${page}, ${String(card.title || slug).trim()}`, field: "tier names and starting price", value: `${card.meta} / ${card.price_note || ""} ${card.price || ""}`.trim(), kind: "reused" });
    }
  }
  /* The FAQ's small label, as the homepage FAQ has it. */
  const faq = firstWidget(rows, "faq");
  if (faq && blank((faq.data || (faq.data = {})).eyebrow)) fill(faq.data, "eyebrow", "FAQ", `${page}, FAQ`, "label", notes);
  return withHomeContact(rows, ctx, "services", page, notes);
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
  if (ctx.kind === "services") return servicesIndexGaps(copy, ctx, notes);
  if (ctx.kind === "about") return aboutGaps(copy, notes);
  return copy;
};
