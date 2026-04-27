/**
 * Row default values and small construction / read helpers.
 *
 * This module owns the *data shape defaults* used across the page
 * builder — anything a freshly-created row, cell, widget or design
 * blob should look like. Pure values plus tiny helpers that depend on
 * those values; no migration logic and no rendering.
 *
 * Keep this file free of React imports and JSX so it can be consumed
 * from services, hooks and migration code without pulling UI in.
 */

import type { ContactField, GradientConfig, PageCell, PageCellLayout, PageCellSpan, PageCellStyle, PageRow, PageRowV3, RowLayout, WidgetDesignSettings, ColumnLayoutPreset } from "@/types/rows";

/* ─── Gradient ─────────────────────────────────────────────────────── */

/** Disabled-by-default linear gradient used as the seed for new rows. */
export const DEFAULT_GRADIENT: GradientConfig = {
  type: "linear",
  angle: 135,
  radialShape: "ellipse",
  radialPosition: "center",
  stops: [
    { color: "#4D1B5E", position: 0 },
    { color: "#5A2370", position: 100 },
  ],
  enabled: false,
};

/* ─── Row layout ───────────────────────────────────────────────────── */

/** Baseline row layout — single column, comfortable vertical padding. */
export const DEFAULT_ROW_LAYOUT: RowLayout = {
  columns: 1,
  fullWidth: false,
  paddingTop: 64,
  paddingBottom: 64,
  marginTop: 0,
  marginBottom: 0,
  alignment: "auto",
};

/* ─── Widget design ────────────────────────────────────────────────── */

/** Defaults applied by the WidgetWrapper when no per-widget overrides exist. */
export const DEFAULT_DESIGN_SETTINGS: WidgetDesignSettings = {
  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  bgColor: "",
  borderRadius: 0,
  visibility: { mobile: true, desktop: true },
  customCss: "",
};

/**
 * Read a widget's design settings from a cell `content` blob, merging
 * over defaults so callers always receive a complete object — even
 * when the JSON is partial or predates a field. The nested `visibility`
 * object is merged separately so omitting one flag does not silently
 * collapse the other to `undefined`.
 */
export const readDesignSettings = (
  content: Record<string, any> | null | undefined,
): WidgetDesignSettings => {
  const stored = (content && (content as any).__design) || {};
  return {
    ...DEFAULT_DESIGN_SETTINGS,
    ...stored,
    visibility: {
      ...DEFAULT_DESIGN_SETTINGS.visibility,
      ...(stored.visibility || {}),
    },
  };
};

/* ─── Global widget reference ──────────────────────────────────────── */

/**
 * Reserved key on a cell's `content` blob. When present, the renderer
 * resolves the value as a `global_widgets.id` and renders that widget
 * instead of the local content. Per-instance `__design` overrides are
 * preserved alongside the reference.
 */
export const GLOBAL_REF_KEY = "__global_ref" as const;

/** Returns the global widget id from a cell's content blob, or null. */
export const readGlobalRef = (
  content: Record<string, any> | null | undefined,
): string | null => {
  if (!content) return null;
  const v = (content as any)[GLOBAL_REF_KEY];
  return typeof v === "string" && v.length > 0 ? v : null;
};

/**
 * Build a content blob that points at a global widget, optionally
 * preserving the existing per-instance `__design` overrides.
 */
export const buildGlobalRefContent = (
  globalId: string,
  preserveDesign?: Record<string, any> | null,
): Record<string, any> => {
  const out: Record<string, any> = { [GLOBAL_REF_KEY]: globalId };
  if (preserveDesign && (preserveDesign as any).__design) {
    out.__design = (preserveDesign as any).__design;
  }
  return out;
};

/* ─── Contact form ─────────────────────────────────────────────────── */

/** Seed field set used for newly-created contact widgets. */
export const DEFAULT_CONTACT_FIELDS: ContactField[] = [
  { key: "name", label: "Your name", type: "text", required: true, visible: true },
  { key: "email", label: "Email address", type: "email", required: true, visible: true },
  { key: "company", label: "Company", type: "text", required: false, visible: true },
  { key: "message", label: "How can we help?", type: "textarea", required: true, visible: true },
  { key: "marketing", label: "Keep me updated with news and articles", type: "checkbox", required: false, visible: true },
];

/* ─── Id generator ─────────────────────────────────────────────────── */

/** Stable id generator used for rows, columns, cells and widgets. */
export const generateRowId = (): string => crypto.randomUUID();

/* ─── Cell defaults ────────────────────────────────────────────────── */

export const DEFAULT_CELL_LAYOUT: PageCellLayout = {
  direction: "vertical",
  verticalAlign: "top",
  justify: "stretch",
  gap: 24,
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  minHeight: 0,
};

export const DEFAULT_CELL_STYLE: PageCellStyle = {
  bgColor: "",
  borderRadius: 0,
  borderColor: "",
  borderWidth: 0,
  customClass: "",
  customCss: "",
};

export const DEFAULT_CELL_SPAN: PageCellSpan = { col: 1, row: 1 };

/** Build an empty cell (no widgets) with default layout/style/span. */
export const buildEmptyCell = (): PageCell => ({
  id: generateRowId(),
  layout: { ...DEFAULT_CELL_LAYOUT },
  style: { ...DEFAULT_CELL_STYLE },
  span: { ...DEFAULT_CELL_SPAN },
  widgets: [],
});

/**
 * Build an empty v3 row with `columnCount` columns, each containing one
 * empty cell. Used by the "Layout" cards in the Elements tray.
 */
export const buildEmptyV3Row = (columnCount: 1 | 2 | 3 | 4 = 1): PageRowV3 => {
  const presetByCount: Record<number, ColumnLayoutPreset> = {
    1: "100",
    2: "50-50",
    3: "33-33-33",
    4: "25-25-25-25",
  };
  const equalWidth = Math.round(100 / columnCount);
  const widths = Array.from({ length: columnCount }, () => equalWidth);
  return {
    id: generateRowId(),
    schema_version: 3,
    strip_title: `${columnCount}-column row`,
    bg_color: "",
    layout: { ...DEFAULT_ROW_LAYOUT, column_widths: widths },
    column_layout: presetByCount[columnCount] || "custom",
    columns: Array.from({ length: columnCount }, () => ({
      id: generateRowId(),
      cell_direction: "vertical" as const,
      cells: [buildEmptyCell()],
    })),
  };
};

/** Read a cell's layout, merging stored values over defaults. */
export const readCellLayout = (cell?: Partial<PageCell> | null): PageCellLayout => ({
  ...DEFAULT_CELL_LAYOUT,
  ...(cell?.layout || {}),
});

/** Read a cell's style, merging stored values over defaults. */
export const readCellStyle = (cell?: Partial<PageCell> | null): PageCellStyle => ({
  ...DEFAULT_CELL_STYLE,
  ...(cell?.style || {}),
});

/** Read a cell's grid span, merging stored values over defaults. */
export const readCellSpan = (cell?: Partial<PageCell> | null): PageCellSpan => ({
  ...DEFAULT_CELL_SPAN,
  ...(cell?.span || {}),
});

/* ─── Legacy column helpers ────────────────────────────────────────── */

/** Return all column contents and their proportional widths for a legacy row. */
export const getRowColumns = (row: PageRow) => {
  const contents = [row.content, ...(row.columns_data || [])];
  const widths =
    row.layout?.column_widths ||
    contents.map(() => Math.round(100 / contents.length));
  return { contents, widths, isMultiCol: contents.length > 1 };
};

/** Inline `display: grid` style for a legacy multi-column row. */
export const multiColGridStyle = (widths: number[]): React.CSSProperties => ({
  display: "grid",
  gridTemplateColumns: widths.map((w) => `${w}fr`).join(" "),
  gap: "2rem",
});

/* ─── Seed page rows ───────────────────────────────────────────────── */

/**
 * Seed content shipped with a brand-new site.
 *
 * Kept intentionally generic — no brand-specific copy, no domain-
 * specific examples — so this codebase can be re-used as a starter
 * template. The admin will replace these strings on first edit.
 */
export const DEFAULT_ROWS: PageRow[] = [
  {
    id: generateRowId(),
    type: "text",
    strip_title: "Intro",
    bg_color: "#FFFFFF",
    content: {
      title_lines: ["<p>Welcome to your new site.</p>"],
      subtitle: "",
      subtitle_color: "",
      body: "Edit this section in the page builder to introduce yourself, your product, or your service.",
    },
  },
  {
    id: generateRowId(),
    type: "boxed",
    strip_title: "Highlights",
    bg_color: "#F5F5F5",
    content: {
      title_lines: ["<p>Three things to highlight</p>"],
      subtitle: "",
      subtitle_color: "",
      cards: [
        { title: "First point", body: "Describe the first thing visitors should know about." },
        { title: "Second point", body: "Describe the second thing visitors should know about." },
        { title: "Third point", body: "Describe the third thing visitors should know about." },
      ],
    },
  },
  {
    id: generateRowId(),
    type: "contact",
    strip_title: "Contact",
    bg_color: "#FFFFFF",
    content: {
      title_lines: ["<p>Get in touch.</p>"],
      body: "Send us a message and we'll get back to you.",
      button_text: "Send message",
      success_heading: "Message received.",
      success_body: "Thanks for reaching out — we'll be in touch shortly.",
      success_button: "Send another message",
      show_social: false,
      fields: DEFAULT_CONTACT_FIELDS,
    },
  },
];
