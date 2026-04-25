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

import type {
  ContactField,
  GradientConfig,
  PageCell,
  PageCellLayout,
  PageCellSpan,
  PageCellStyle,
  PageRow,
  PageRowV3,
  RowLayout,
  WidgetDesignSettings,
  ColumnLayoutPreset,
} from "@/types/rows";

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
  { key: "message", label: "Tell us about your vampire moment", type: "textarea", required: true, visible: true },
  { key: "marketing", label: "Keep me updated with insights and articles", type: "checkbox", required: false, visible: true },
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

/** Seed content shipped with a brand-new site. */
export const DEFAULT_ROWS: PageRow[] = [
  {
    id: generateRowId(),
    type: "text",
    strip_title: "Intro",
    bg_color: "#F9F0C1",
    content: {
      title_lines: [],
      subtitle: "",
      subtitle_color: "",
      body: 'We work across two disciplines: <strong>Internal Communications</strong> and <strong>Employee Experience</strong>. Every engagement starts with the same question — where is the life being drained? — and ends with something that actually works.',
    },
  },
  {
    id: generateRowId(),
    type: "service",
    strip_title: "Internal Communications",
    bg_color: "#FFFFFF",
    content: {
      eyebrow: "Pillar 01",
      title: "Internal Communications",
      description: "Most internal comms is noise dressed up as signal.",
      services: [
        {
          tag: "Fixed project", tagType: "fixed", title: "The Inspection", subtitle: "Internal Communications Audit",
          description: "Something is off. Messages are landing flat. Town halls feel like theatre.",
          deliverables: ["Stakeholder interviews", "Full audit", "Written findings report", "Action roadmap"],
          price: "Book a free consultation", time: "2–3 weeks · ~15–20 hours",
        },
      ],
    },
  },
  {
    id: generateRowId(),
    type: "service",
    strip_title: "Employee Experience",
    bg_color: "#F4F0EC",
    content: {
      eyebrow: "Pillar 02",
      title: "Employee Experience",
      description: "The modern workplace is haunted by zombie journeys.",
      services: [
        {
          tag: "Fixed project", tagType: "fixed", title: "The Inspection", subtitle: "Employee Experience Audit",
          description: "Before you can fix the experience, you need to know where it's bleeding.",
          deliverables: ["Employee interviews", "Lifecycle review", "Journey Map", "Recommendations report"],
          price: "Book a free consultation", time: "2 weeks · ~14–18 hours",
        },
      ],
    },
  },
  {
    id: generateRowId(),
    type: "boxed",
    strip_title: "Vows",
    bg_color: "#2A0E33",
    content: {
      title_lines: ["<p>Before we shake hands,</p>", "<p>here is what we vow.</p>"],
      subtitle: "",
      subtitle_color: "",
      cards: [
        { title: "Precision over pomp", body: "Our reports are as clear as a glass prism and as sharp as a stake. No buzzwords. No padding. No synergy." },
        { title: "The human trace", body: "Behind every strategy is a handwritten insight. Your people are not capital. They are the life-force." },
        { title: "Expansive horizons", body: "We don't just fix the room. We remove the ceiling. Every engagement is a door to something bigger." },
      ],
    },
  },
  {
    id: generateRowId(),
    type: "contact",
    strip_title: "Contact",
    bg_color: "#FFFFFF",
    content: {
      title_lines: ["<p>Not sure where to start?</p>", "<p>Lift the lid first.</p>"],
      body: "Book a free 30-minute consultation. We'll identify your biggest vampire moment and tell you honestly whether we're the right fit to bury it.",
      button_text: "Request a discovery call",
      success_heading: "Message received.",
      success_body: "We respond within 24 hours. Thank you for reaching out.",
      success_button: "Send another message",
      show_social: false,
      fields: DEFAULT_CONTACT_FIELDS,
    },
  },
];
