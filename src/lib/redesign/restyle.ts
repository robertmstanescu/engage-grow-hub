/**
 * Redesign restyle: turn a page's stored rows into the same rows wearing
 * the new look (docs/redesign). It changes STYLE SETTINGS ONLY: row
 * layout, named variants, inline colours and sizes inside rich text.
 * It never adds, removes or rewrites a word of copy; `visibleText()`
 * below is the proof used by the unit test and by the SQL builder.
 *
 * Pure functions, no I/O. `scripts/redesign/build-restyle.ts` feeds
 * them a snapshot of the live content and writes the SQL that Lovable
 * runs against the DRAFT columns.
 *
 * Gap copy (sections the design has and the site did not) is NOT
 * handled here: see `gapContent.ts`, which is applied separately so the
 * "no words changed" proof stays strict for this file.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

export type PageKind = "home" | "services" | "service" | "about" | "privacy" | "other";

export interface RestyleContext {
  kind: PageKind;
  /** Page slug segment after /services/ on a service page. */
  pillarSlug?: string;
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/* ── Rich text ─────────────────────────────────────────────────────── */

/** Colours that mean "the default text colour" once tokens apply. */
const DEFAULT_TEXT_RGB = new Set([
  "38,20,46", "42,14,51", "43,14,51", "77,27,94", "255,255,255", "0,0,0", "72,28,95",
]);
/** Colours that mark an accent phrase: become the named accent. */
const ACCENT_RGB = new Set(["229,197,79", "230,194,76", "234,208,110", "103,39,134", "123,58,145"]);

const rgbKey = (value: string): string | null => {
  const m = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) return `${m[1]},${m[2]},${m[3]}`;
  const h = value.trim().match(/^#([0-9a-f]{6})$/i);
  if (h) {
    const n = parseInt(h[1], 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }
  return null;
};

interface CleanOptions {
  /** Titles: keep pillar colours, turn gold-ish spans into the named accent. */
  title?: boolean;
}

/**
 * Remove presentational inline styles the token layer now owns
 * (font-size, default colours, font-family other than the handwriting
 * face, left alignment). A `<span>` left with no attributes is
 * unwrapped. Text nodes are never touched.
 */
export const cleanRichText = (html: string, opts: CleanOptions = {}): string => {
  if (!html || html.indexOf("<") === -1) return html;
  const parts = html.split(/(<[^>]+>)/g);
  /** For each open <span>, whether we dropped its tag (so we drop its close too). */
  const spanStack: boolean[] = [];
  const out: string[] = [];
  for (const part of parts) {
    if (!part.startsWith("<")) { out.push(part); continue; }
    const closeSpan = /^<\/span\s*>$/i.test(part);
    if (closeSpan) {
      const dropped = spanStack.pop();
      if (!dropped) out.push(part);
      continue;
    }
    const open = part.match(/^<([a-z0-9]+)\b([^>]*)>$/i);
    if (!open) { out.push(part); continue; }
    const tag = open[1].toLowerCase();
    let attrs = open[2];
    let addAccent = false;
    attrs = attrs.replace(/\sstyle\s*=\s*"([^"]*)"/i, (_m, style: string) => {
      const kept: string[] = [];
      /* `&quot;` inside a font-family value contains a ";": decode first
         so declarations split correctly. */
      for (const decl of style.replace(/&quot;/g, "'").split(";")) {
        const d = decl.trim();
        if (!d) continue;
        const idx = d.indexOf(":");
        if (idx === -1) continue;
        const prop = d.slice(0, idx).trim().toLowerCase();
        const value = d.slice(idx + 1).trim();
        if (prop === "font-size") continue;
        if (prop === "font-family") {
          if (/architects daughter/i.test(value)) kept.push(`font-family: 'Architects Daughter', cursive`);
          continue;
        }
        if (prop === "text-align" && value.toLowerCase() === "left") continue;
        if (prop === "color") {
          const key = rgbKey(value);
          if (key && DEFAULT_TEXT_RGB.has(key)) continue;
          if (key && ACCENT_RGB.has(key)) { addAccent = true; continue; }
          kept.push(`color: ${value}`);
          continue;
        }
        kept.push(`${prop}: ${value}`);
      }
      return kept.length ? ` style="${kept.join("; ")}"` : "";
    });
    if (addAccent && opts.title) {
      attrs = /\sclass\s*=/.test(attrs)
        ? attrs.replace(/\sclass\s*=\s*"([^"]*)"/i, (_m, c: string) => ` class="${c} mc-accent"`)
        : `${attrs} class="mc-accent"`;
    }
    if (tag === "span") {
      const bare = attrs.trim() === "";
      spanStack.push(bare);
      if (bare) continue;
    }
    out.push(`<${open[1]}${attrs}>`);
  }
  return out.join("");
};

/** The words a visitor reads in a value: tags and entities flattened. */
export const visibleText = (value: Json): string => {
  const chunks: string[] = [];
  const walk = (v: Json, key = "") => {
    if (typeof v === "string") {
      if (/(_url|^icon$|^image$|^id$|^type$|^variant$|^pillar$|_style$|_mode$|_position$|_layout$|^align|^color|_color$|_shape$|^key$|^tagType$|_ratio$|_size$|_as_title$|_as_note$)/i.test(key)) return;
      if (/^(https?:|\/|#|lucide:|custom:)/.test(v)) return;
      const text = v.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
      if (text) chunks.push(text);
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) {
        /* Engine and admin-only keys: never shown to a visitor. */
        if (["layout", "style", "__design", "strip_title", "column_layout", "cell_direction", "span", "scope"].includes(k)) continue;
        walk(x, k);
      }
    }
  };
  walk(value);
  return chunks.join("\n");
};

/* ── Row layout ────────────────────────────────────────────────────── */

const STRIP_LAYOUT_KEYS = [
  "glass", "surfaceRadius", "shapeTop", "shapeBottom", "outlineWidth", "outlineColor",
  "bandTone", "dividerTop", "bgColorOpacity",
];

const plainRow = (row: Json): Json => {
  const layout = { ...(row.layout || {}) };
  for (const k of STRIP_LAYOUT_KEYS) delete layout[k];
  layout.alignment = "left";
  layout.snapEnabled = false;
  row.layout = layout;
  row.bg_color = "";
  return row;
};

const widgetsOf = (row: Json): Json[] => {
  const list: Json[] = [];
  for (const col of row.columns || []) for (const cell of col.cells || []) for (const w of cell.widgets || []) list.push(w);
  return list;
};

const HTML_FIELDS = ["body", "description", "answer", "subtitle", "note"];
const COLOUR_FIELD = /^(color_|.*_color$)/;

/** Clear per-part colour overrides so the tokens decide; clean rich text. */
const normaliseWidgetData = (data: Json): void => {
  const visit = (node: Json) => {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!node || typeof node !== "object") return;
    for (const [k, v] of Object.entries(node)) {
      if (k === "__design") continue;
      if (typeof v === "string") {
        if (COLOUR_FIELD.test(k) && k !== "accent_color") node[k] = "";
        else if (k === "title_lines") continue;
        else if (HTML_FIELDS.includes(k)) node[k] = cleanRichText(v);
      } else if (k === "title_lines" && Array.isArray(v)) {
        node[k] = v.map((line) => (typeof line === "string" ? cleanRichText(line, { title: true }) : line));
      } else visit(v);
    }
  };
  visit(data);
};

/* ── Per-widget looks ──────────────────────────────────────────────── */

const isServiceLink = (url?: string) => /^\/services\/[a-z-]+\/?$/.test((url || "").trim());

const restyleBoxed = (data: Json, row: Json): void => {
  const cards: Json[] = data.cards || [];
  if (data.layout_mode === "list") {
    cards.forEach((c) => { c.variant = "pillar"; });
    return;
  }
  const allServiceLinks = cards.length >= 4 && cards.every((c) => isServiceLink(c.link_url));
  const firstIsProblem = cards.length >= 2 && /problem/i.test(String(cards[0]?.title || ""));
  if (allServiceLinks) {
    data.marker_style = "pillar_number";
    cards.forEach((c) => { c.variant = "pillar"; });
  } else if (firstIsProblem) {
    data.marker_style = "bar";
    cards.forEach((c, i) => { c.variant = i === 0 ? "dark" : "glass"; });
  } else if (data.marker_style === "roman") {
    cards.forEach((c) => { c.variant = "glass"; });
  } else if (cards.length === 1 && !String(cards[0].title || "").trim()) {
    /* A lone untitled card is the handwritten pull line under the vows. */
    data.marker_style = "note";
    cards[0].variant = "";
  } else {
    data.marker_style = data.marker_style || "bar";
    cards.forEach((c) => { c.variant = "glass"; });
  }
  /* Cards that link to no pillar are heading purple in the design: drop
     the per-card accent colours the old look painted on them. */
  if (!allServiceLinks) cards.forEach((c) => { if (!isServiceLink(c.link_url)) delete c.accent_color; });
  void row;
};

const restyleImageText = (data: Json, ctx: RestyleContext): void => {
  if (ctx.kind === "service") {
    /* "What good looks like": the dark plum panel of the service artboards. */
    data.panel_style = "pillar";
    data.pillar = ctx.pillarSlug || "";
  } else {
    data.panel_style = "";
    data.image_position = "left";
    data.split_widths = [48, 52];
  }
};

const restyleSteps = (data: Json, ctx: RestyleContext): void => {
  data.step_style = "cards";
  if (ctx.kind === "service") {
    /* The handwritten line is the section's heading in the design. */
    data.subtitle_as_title = true;
    data.last_step_as_note = (data.steps || []).length === 4 && !String(data.steps[3]?.title || "").trim();
  }
};

const restyleHero = (data: Json, ctx: RestyleContext): void => {
  if (data.visual_image_url) data.visual_layout = "half_bleed";
  data.align = "left";
  data.title_size = ctx.kind === "service" ? "compact" : ctx.kind === "home" ? "" : "display";
};

/* ── Page ──────────────────────────────────────────────────────────── */

const newId = (seed: string) => `rs-${seed}`;

/** Service pages: tiers and FAQ share one row; the design gives each its own. */
const splitServiceAndFaq = (rows: Json[]): Json[] => {
  const out: Json[] = [];
  for (const row of rows) {
    const types = widgetsOf(row).map((w) => w.type);
    const isPair = types.length === 2 && types.includes("service") && types.includes("faq");
    if (!isPair) { out.push(row); continue; }
    const make = (type: string, title: string): Json => {
      const widget = widgetsOf(row).find((w) => w.type === type);
      const source = row.columns.find((c: Json) => (c.cells || []).some((cell: Json) => (cell.widgets || []).includes(widget)));
      const col = clone(source);
      col.id = newId(`${row.id}-${type}-col`);
      col.cells = col.cells.map((cell: Json, i: number) => ({ ...cell, id: newId(`${row.id}-${type}-cell${i}`) }));
      return {
        ...clone({ ...row, columns: [] }),
        id: type === "service" ? row.id : newId(`${row.id}-faq`),
        strip_title: title,
        column_layout: "100",
        layout: { ...clone(row.layout || {}), column_widths: [100] },
        columns: [col],
      };
    };
    out.push(make("service", "Engagements"), make("faq", "FAQ"));
  }
  return out;
};

export const restyleRows = (input: Json[], ctx: RestyleContext): Json[] => {
  let rows: Json[] = clone(input);
  if (ctx.kind === "service") rows = splitServiceAndFaq(rows);
  for (const row of rows) {
    plainRow(row);
    for (const w of widgetsOf(row)) {
      const data = w.data || (w.data = {});
      /* A service hero's label keeps its pillar colour (the design's
         pillar-coloured eyebrow); every other per-part colour resets. */
      const pillarLabel = w.type === "hero" && ctx.kind === "service" ? data.color_label : undefined;
      normaliseWidgetData(data);
      if (pillarLabel) data.color_label = pillarLabel;
      if (w.type === "boxed") restyleBoxed(data, row);
      else if (w.type === "image_text") restyleImageText(data, ctx);
      else if (w.type === "process_steps") restyleSteps(data, ctx);
      else if (w.type === "hero") restyleHero(data, ctx);
      else if (w.type === "proof_band") data.band_style = "deep";
      else if (w.type === "text" && ctx.kind === "privacy") data.panel_style = "glass";
    }
  }
  return rows;
};

export const kindForSlug = (slug: string): RestyleContext => {
  if (slug === "services") return { kind: "services" };
  if (slug.startsWith("services/")) return { kind: "service", pillarSlug: slug.slice("services/".length) };
  if (slug === "about-us") return { kind: "about" };
  if (slug === "privacy-policy") return { kind: "privacy" };
  return { kind: "other" };
};
