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
        /* A plain `title` beside filled `title_lines` is the old fallback:
           the page prints the lines, never both. */
        if (k === "title" && typeof x === "string" && Array.isArray((v as Json).title_lines) && (v as Json).title_lines.some((l: Json) => String(l ?? "").replace(/<[^>]+>/g, "").trim())) continue;
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

/**
 * About page: the design shows the photo beside the hero headline, and
 * the story under it as plain text. Today the photo is a banner laid
 * over the story row. Move the same picture (and its focal point) to
 * the hero; no words move.
 */
const COVER_KEYS = ["coverImage", "coverImageRatio", "coverHeight", "coverTextOverlap", "coverFocalX", "coverFocalY"];
const movePhotoToHero = (rows: Json[]): void => {
  const heroRow = rows.find((r) => widgetsOf(r).some((w) => w.type === "hero"));
  const hero = heroRow && widgetsOf(heroRow).find((w) => w.type === "hero");
  const coverRow = rows.find((r) => r !== heroRow && typeof r.layout?.coverImage === "string" && r.layout.coverImage.trim());
  if (!hero || !coverRow) return;
  const data = hero.data || (hero.data = {});
  if (String(data.visual_image_url || "").trim()) return;
  data.visual_image_url = coverRow.layout.coverImage.trim();
  data.visual_layout = "half_bleed";
  if (typeof coverRow.layout.coverFocalX === "number") data.visual_image_focal_x = coverRow.layout.coverFocalX;
  if (typeof coverRow.layout.coverFocalY === "number") data.visual_image_focal_y = coverRow.layout.coverFocalY;
  for (const k of COVER_KEYS) delete coverRow.layout[k];
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

/* ── Page rhythm ───────────────────────────────────────────────────────
   The canvas gives each section its own room: a full section keeps the
   page rhythm above and below, a section that follows another one sits
   closer to it. `space` writes that as the row's Style ▸ Space setting. */
type Space = "lead" | "full" | "mid" | "near" | "tight" | "none";
const space = (row: Json, top: Space, bottom: Space): void => {
  row.layout = { ...(row.layout || {}), spaceTop: top, spaceBottom: bottom };
};
const hasWidget = (row: Json, type: string): boolean => widgetsOf(row).some((w) => w?.type === type);

/**
 * Services index in the canvas arrangement (artboard Services): the
 * pillars photo moves into the hero, and the heading and intro that sat
 * beside it become the heading of the list ("Our services" turns into
 * the small label over it). Words only move; none change. Idempotent.
 */
export const arrangeServices = (rows: Json[]): Json[] => {
  const out = [...rows];
  const hero = out.flatMap(widgetsOf).find((w) => w?.type === "hero");
  const listRow = out.find((r) => widgetsOf(r).some((w) => w?.type === "boxed" && w.data?.layout_mode === "list"));
  const list = listRow && widgetsOf(listRow).find((w) => w?.type === "boxed");
  const picAt = out.findIndex((r) => hasWidget(r, "image_text"));
  if (hero && list && picAt > -1) {
    const pic = widgetsOf(out[picAt]).find((w) => w?.type === "image_text");
    const pd = pic?.data || {};
    const hd = hero.data || (hero.data = {});
    const ld = list.data || (list.data = {});
    const oldTitle = visibleText(ld.title_lines).trim();
    const picTitle = Array.isArray(pd.title_lines) && pd.title_lines.length ? pd.title_lines : pd.title ? [pd.title] : [];
    if (!String(hd.visual_image_url || "").trim() && String(pd.image_url || "").trim() && picTitle.length && !String(ld.eyebrow || "").trim() && !String(ld.intro || "").trim() && !String(pd.eyebrow || "").trim() && !String(pd.floating_caption || "").trim()) {
      hd.visual_image_url = pd.image_url;
      hd.visual_image_alt = pd.image_alt || "";
      hd.visual_layout = "half_bleed";
      ld.eyebrow = oldTitle;
      ld.title_lines = picTitle;
      ld.intro = pd.description || "";
      out.splice(picAt, 1);
    }
  }
  /* The Services hero sets its one-line intro a size larger. */
  if (hero) (hero.data || (hero.data = {})).body_size = "large";
  out.forEach((row) => {
    if (hasWidget(row, "hero")) space(row, "lead", "none");
    else if (hasWidget(row, "faq")) space(row, "none", "none");
  });
  return out;
};

/**
 * A hero headline in the canvas has two lines: the statement, then the
 * line that answers it. Headlines broken into three or more short lines
 * for the old narrow column are joined back into the statement; the last
 * line stays on its own. No word changes. Idempotent.
 */
export const joinHeroLines = (rows: Json[]): void => {
  for (const w of rows.flatMap(widgetsOf)) {
    if (w?.type !== "hero" || !Array.isArray(w.data?.title_lines) || w.data.title_lines.length < 3) continue;
    const lines: string[] = w.data.title_lines.map((l: Json) => String(l ?? ""));
    if (!lines.every((l) => /^<p>[\s\S]*<\/p>$/i.test(l.trim()) || !l.includes("<p"))) continue;
    const inner = (l: string) => l.trim().replace(/^<p>([\s\S]*)<\/p>$/i, "$1").trim();
    const head = lines.slice(0, -1).map(inner).filter(Boolean).join(" ");
    w.data.title_lines = [`<p>${head}</p>`, lines[lines.length - 1]];
  }
};

/**
 * A service page in the canvas rhythm (artboard ServiceIC and its five
 * siblings): the hero opens under the menu with the "In short" strip
 * straight below, and each section keeps the full gap above and a
 * closer one below. The pillar dot goes before the hero label.
 */
export const arrangeService = (rows: Json[]): Json[] => {
  rows.forEach((row) => {
    if (hasWidget(row, "hero")) {
      space(row, "lead", "none");
      for (const w of widgetsOf(row)) if (w?.type === "hero") (w.data || (w.data = {})).label_dot = true;
    } else if (hasWidget(row, "steps")) space(row, "full", "near");
    else if (hasWidget(row, "boxed") || hasWidget(row, "service") || hasWidget(row, "faq")) space(row, "full", "tight");
    else if (hasWidget(row, "from_the_blog")) space(row, "full", "none");
    else if (hasWidget(row, "contact")) space(row, "full", "full");
  });
  return rows;
};

/** Put the named accent on one exact phrase of a title (the artboard's
 *  two-tone headings). Skips a title the owner already accented. */
export const accentPhrase = (lines: Json[], phrase: string): Json[] => {
  const strs = lines.map((l) => String(l ?? ""));
  if (strs.some((l) => l.includes("mc-accent"))) return lines;
  let done = false;
  return strs.map((l) => {
    if (done || !l.includes(phrase)) return l;
    done = true;
    return l.replace(phrase, `<span class="mc-accent">${phrase}</span>`);
  });
};

/**
 * About in the canvas arrangement (artboard About): the hero opens under
 * the menu with the pillars as pills; the story's heading sits beside
 * its text (four columns and eight); the profile is a large portrait;
 * and each section keeps the artboard's gaps. Words only move.
 */
export const arrangeAbout = (rows: Json[]): Json[] => {
  for (const row of rows) {
    const ws = widgetsOf(row);
    if (hasWidget(row, "hero")) {
      space(row, "lead", "none");
      for (const w of ws) if (w?.type === "hero" && w.data?.tagline && !w.data.tagline_handwritten) w.data.tagline_style = "chips";
      /* The About headline's accent line is the gold one. */
      for (const w of ws) if (w?.type === "hero" && Array.isArray(w.data?.title_lines)) w.data.title_lines = w.data.title_lines.map((l: Json) => String(l ?? "").replace(/class="mc-accent"/g, 'class="mc-accent mc-accent-gold"'));
      /* Empty text blocks left beside the hero draw nothing: drop them. */
      for (const col of row.columns || []) for (const cell of col.cells || []) {
        cell.widgets = (cell.widgets || []).filter((w: Json) => !(w?.type === "text" && !visibleText(w.data).trim()));
      }
    } else if (hasWidget(row, "process_steps")) space(row, "none", "full");
    else if (hasWidget(row, "profile")) {
      space(row, "tight", "full");
      for (const w of ws) if (w?.type === "profile") (w.data || (w.data = {})).layout_style = "portrait";
    } else if (hasWidget(row, "proof_band")) space(row, "none", "none");
    else if (hasWidget(row, "boxed")) {
      space(row, "full", "none");
      for (const w of ws) if (w?.type === "boxed" && w.data?.marker_style === "bar") w.data.marker_style = "";
    } else if (hasWidget(row, "contact")) {
      space(row, "full", "full");
      for (const w of ws) if (w?.type === "contact" && Array.isArray(w.data?.title_lines)) w.data.title_lines = accentSecondLine(w.data.title_lines.map((l: Json) => String(l ?? "").replace(/(<p><\/p>)+$/g, "")));
    } else if (ws.length >= 2 && ws.every((w) => w?.type === "text") && Array.isArray(row.columns) && row.columns.length === 2) {
      /* The story: heading on four columns, all of the text on eight. */
      const [first, ...rest] = ws;
      const body = [first.data?.body, ...rest.map((w) => w.data?.body)].filter((b) => typeof b === "string" && b.trim()).join("");
      if (first?.data && !rest.some((w) => visibleText(w.data?.title_lines).trim() || String(w.data?.eyebrow || "").trim())) {
        const head = { ...first, data: { ...first.data, body: "" } };
        const text = { ...rest[0], data: { ...rest[0].data, body } };
        row.columns[0].cells[0].widgets = [head];
        row.columns[1].cells[0].widgets = [text];
        row.layout = { ...(row.layout || {}), column_widths: [33, 67] };
      }
      space(row, "full", "full");
    }
  }
  const phrases = ["vampire moment.", "These stay exposed."];
  for (const w of rows.flatMap(widgetsOf)) {
    if (w?.type === "hero" || !Array.isArray(w?.data?.title_lines)) continue;
    for (const ph of phrases) w.data.title_lines = accentPhrase(w.data.title_lines, ph);
  }
  return rows;
};

/** Wrap the words of a title's second line (or second paragraph) in the
 *  named accent. Tags and text are untouched; idempotent. */
export const accentSecondLine = (lines: Json[]): Json[] => {
  const strs = lines.map((l) => String(l ?? ""));
  if (strs.some((l) => l.includes("mc-accent"))) return lines;
  const wrap = (html: string): string => {
    const m = html.match(/^<p>([\s\S]*)<\/p>$/i);
    return m ? `<p><span class="mc-accent">${m[1]}</span></p>` : `<span class="mc-accent">${html}</span>`;
  };
  if (strs.length >= 2) return strs.map((l, i) => (i === strs.length - 1 && l.trim() ? wrap(l) : l));
  const paras = strs[0]?.match(/<p>[\s\S]*?<\/p>/gi);
  if (paras && paras.length >= 2 && paras.join("") === strs[0]) return [paras.slice(0, -1).join("") + wrap(paras[paras.length - 1])];
  return lines;
};

/**
 * Homepage in the canvas order and rhythm (artboard Main): hero, proof,
 * map, services, the picture-and-text row, problem and fix, vows, FAQ,
 * contact. Rows only move and change their spacing; no word changes.
 * Idempotent; the build script runs it again after the gap rows are added
 * so the proof band and the map get their spacing too.
 */
export const arrangeHome = (rows: Json[]): Json[] => {
  const out = [...rows];
  /* The picture-and-text row sits straight after the services grid. */
  const pic = out.findIndex((r) => hasWidget(r, "image_text"));
  const services = out.findIndex((r) => hasWidget(r, "boxed"));
  if (pic > -1 && services > -1 && pic !== services + 1) {
    const [row] = out.splice(pic, 1);
    out.splice(out.findIndex((r) => hasWidget(r, "boxed")) + 1, 0, row);
  }
  /* Two-tone headlines (artboard Main): the vows and the closing
     headline print their second line in the accent. Only a class is
     added; a line the owner already accented is left alone. */
  out.forEach((row) => {
    const isVows = hasWidget(row, "boxed") && /vow/i.test(String(row.strip_title || ""));
    if (!isVows && !hasWidget(row, "contact")) return;
    for (const w of widgetsOf(row)) if (w?.data && Array.isArray(w.data.title_lines)) w.data.title_lines = accentSecondLine(w.data.title_lines);
  });
  /* The caption on the picture sits on its outer bottom corner. */
  out.forEach((row) => {
    for (const w of widgetsOf(row)) if (w?.type === "image_text" && w.data?.floating_caption) w.data.caption_position = w.data.image_position === "right" ? "bottom-left" : "bottom-right";
  });
  let boxedSeen = 0;
  out.forEach((row, i) => {
    const next = out[i + 1];
    /* The hero opens the page just under the navigation and the band
       below carries its own gap (canvas: 5vw above the band). */
    if (hasWidget(row, "hero")) space(row, "lead", "none");
    else if (hasWidget(row, "proof_band")) space(row, "none", "none");
    else if (hasWidget(row, "world_map")) space(row, "mid", "none");
    else if (hasWidget(row, "image_text")) space(row, "tight", "full");
    else if (hasWidget(row, "faq")) space(row, "tight", "none");
    else if (hasWidget(row, "contact")) space(row, "full", "full");
    else if (hasWidget(row, "boxed")) {
      boxedSeen += 1;
      const data = widgetsOf(row)[0]?.data || {};
      const cards = Array.isArray(data.cards) ? data.cards.length : 0;
      /* A boxed row with no cards is a closing line under the row above. */
      const closingNext = !!next && hasWidget(next, "boxed") && !((widgetsOf(next)[0]?.data?.cards || []).some((c: Json) => c?.title));
      if (!cards || !data.cards.some((c: Json) => c?.title)) space(row, "tight", "full");
      else if (boxedSeen <= 2) space(row, "full", "full");
      /* A closing handwritten line below belongs to this row: no gap of its own. */
      else space(row, "tight", closingNext ? "none" : "full");
    }
  });
  return out;
};

export const restyleRows = (input: Json[], ctx: RestyleContext): Json[] => {
  let rows: Json[] = clone(input);
  if (ctx.kind === "service") rows = splitServiceAndFaq(rows);
  for (const row of rows) {
    plainRow(row);
    /* Only service pages tint the page mesh (their pillar colour). A dark
       mesh left on any other page would turn its text light on glass. */
    if (ctx.kind !== "service" && row.layout) delete row.layout.mesh;
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
      else if (w.type === "service") {
        /* Tiers: all visible, three across, with the pillar's top border. */
        data.card_layout = "grid";
        if (ctx.pillarSlug) data.pillar = ctx.pillarSlug;
      }
      else if (w.type === "proof_band") data.band_style = "deep";
      else if (w.type === "text" && ctx.kind === "privacy") data.panel_style = "glass";
    }
  }
  if (ctx.kind === "about") movePhotoToHero(rows);
  if (ctx.kind === "about") rows = arrangeAbout(rows);
  if (ctx.kind === "home") rows = arrangeHome(rows);
  if (ctx.kind === "services") rows = arrangeServices(rows);
  if (ctx.kind === "service") rows = arrangeService(rows);
  if (ctx.kind === "service" || ctx.kind === "home") joinHeroLines(rows);
  return rows;
};

export const kindForSlug = (slug: string): RestyleContext => {
  if (slug === "services") return { kind: "services" };
  if (slug.startsWith("services/")) return { kind: "service", pillarSlug: slug.slice("services/".length) };
  if (slug === "about-us") return { kind: "about" };
  if (slug === "privacy-policy") return { kind: "privacy" };
  return { kind: "other" };
};
