export type GradientType = "linear" | "radial" | "conic" | "mesh";

export interface GradientStop {
  color: string;
  position: number; // 0-100
  alpha?: number;   // 0-100, defaults to 100
}

export interface GradientConfig {
  type: GradientType;
  angle: number; // 0-360 for linear/conic
  radialShape?: "circle" | "ellipse";
  radialPosition?: string; // e.g. "center", "top left"
  stops: GradientStop[];
  enabled: boolean;
}

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

export type OverlayFit = "fit" | "fill" | "original";
export type OverlayAnchor = "top-left" | "top-center" | "top-right" | "middle-left" | "middle-center" | "middle-right" | "bottom-left" | "bottom-center" | "bottom-right";
export type BlendMode = "normal" | "multiply" | "screen" | "overlay" | "soft-light" | "hard-light" | "color-dodge" | "color-burn" | "difference" | "exclusion" | "luminosity";

export interface OverlayElement {
  id: string;
  url: string;
  fit: OverlayFit;
  anchor: OverlayAnchor;
  opacity: number;   // 0-100
  rotation: number;  // 0-360
  blendMode: BlendMode;
}

export interface RowLayout {
  columns: 1 | 2 | 3 | 4;
  column_widths?: number[]; // proportional widths, e.g. [60, 40]
  fullWidth: boolean;
  paddingTop: number;
  paddingBottom: number;
  marginTop: number;
  marginBottom: number;
  bgImage?: string;
  bgImageOpacity?: number; // 0-100, defaults to 100
  bgColorOpacity?: number; // 0-100, defaults to 100 (applies to row.bg_color)
  alignment?: "auto" | "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  gradientStart?: string;
  gradientEnd?: string;
  gradient?: GradientConfig;
  overlays?: OverlayElement[];
  carouselTheme?: "auto" | "light" | "dark";
}

export const DEFAULT_ROW_LAYOUT: RowLayout = {
  columns: 1,
  fullWidth: false,
  paddingTop: 64,
  paddingBottom: 64,
  marginTop: 0,
  marginBottom: 0,
  alignment: "auto",
};

/**
 * ─────────────────────────────────────────────────────────────────────
 * PageRow — the canonical CMS row record
 * ─────────────────────────────────────────────────────────────────────
 * Stored as JSON in `cms_pages.page_rows` / `site_content.content.rows`.
 *
 * HOW TO ADD A NEW ROW TYPE (junior-engineer guide)
 * 1. Add the new string to the `type` union below.
 * 2. Pick a JSON shape for `content` (see `TestimonialItem` etc. for
 *    examples of small typed sub-shapes you can co-locate here).
 * 3. Register it in `ROW_TYPE_OPTIONS` in
 *    `src/features/admin/AdminDashboard.tsx` so admins can add it.
 * 4. Add a `case` in `RowContentEditor.tsx` (admin editor block).
 * 5. Create `src/features/site/rows/<YourRow>.tsx` (public renderer).
 * 6. Register the new component in the switch in
 *    `src/features/site/rows/PageRows.tsx`.
 * That's the entire pipeline — no DB migration is needed because
 * `content` is a free-form JSON blob.
 * ───────────────────────────────────────────────────────────────────── */
export interface PageRow {
  id: string;
  type:
    | "hero"
    | "text"
    | "service"
    | "boxed"
    | "contact"
    | "image_text"
    | "image"          // EPIC 13 — standalone Image widget with mandatory alt-text
    | "profile"
    | "grid"
    | "lead_magnet"
    | "testimonial"
    | "logo_cloud"
    | "faq";
  strip_title: string;
  bg_color: string;
  scope?: string;
  layout?: RowLayout;
  content: Record<string, any>;
  columns_data?: Record<string, any>[]; // extra columns beyond the first
}

/* ─────────────────────────────────────────────────────────────────────
 * Sub-shapes for the new row types. Keep these in sync if you rename
 * fields — they are referenced by both the admin editor and the public
 * renderers.
 * ───────────────────────────────────────────────────────────────────── */
export interface TestimonialItem {
  quote: string;        // sanitised HTML (rich text)
  name: string;         // client name
  role?: string;        // role / company
  avatar?: string;      // optional public image URL
  avatar_alt?: string;  // alt text for the avatar
}

export interface FaqItem {
  question: string;     // plain text
  answer: string;       // sanitised HTML (rich text)
}

export interface LogoCloudLogo {
  url: string;          // public image URL
  alt?: string;         // logo alt text
}

/* ─────────────────────────────────────────────────────────────────────
 * WIDGET DESIGN SETTINGS — US 6.1 ("The Inspector")
 * ─────────────────────────────────────────────────────────────────────
 * Generic, type-agnostic visual controls every widget inherits via the
 * `WidgetWrapper`. Stored under the reserved `__design` key on a cell's
 * content blob so legacy renderers ignore it (they only read their own
 * known fields) and the engine can apply margin / padding / background
 * / border-radius UNIFORMLY without each widget re-implementing them.
 *
 * WHY this lives in `content.__design` instead of on the `PageRow`:
 * Per US 6.1 these settings are PER-WIDGET, not per-row. In the legacy
 * shape a widget == a column's content blob, so co-locating the design
 * settings there means the data travels with the widget when it's
 * dragged across cells (see `swap`/`writeCell` in RowsManager). Moving
 * them to the row would split a widget's data across two locations.
 *
 * The double-underscore prefix is a soft reservation: widget content
 * fields use plain names, and the wrapper is the only consumer of
 * `__design` — so collisions are practically impossible.
 * ───────────────────────────────────────────────────────────────────── */
export interface WidgetDesignSettings {
  /** Outer margin in px — top/right/bottom/left. */
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  /** Inner padding in px — top/right/bottom/left. */
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  /** Background colour applied to the widget's wrapper. Empty = transparent. */
  bgColor: string;
  /** Border radius in px applied to all four corners. */
  borderRadius: number;
  /**
   * Responsive visibility flags (US 6.2). Both default to `true` so
   * existing rows render everywhere. The frontend wrapper translates
   * these into Tailwind `hidden` / `md:hidden` / `md:block` classes.
   *
   * Breakpoint contract: we use Tailwind's `md` (≥768px) as the
   * "desktop" threshold. Below it counts as mobile. This matches the
   * rest of the codebase's responsive breakpoint convention so admins
   * see consistent behaviour across the site.
   */
  visibility: {
    mobile: boolean;
    desktop: boolean;
  };
}

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
};

/**
 * Read a widget's design settings from a cell `content` blob, merging
 * over the defaults so callers always receive a complete object even
 * when the JSON predates US 6.1.
 *
 * WHY we merge defensively: corrupted or partial blobs (the QA matrix
 * in WIDGETS.md explicitly tests for this) would otherwise yield
 * `undefined` styles and broken layouts.
 *
 * WHY visibility is merged separately: it's a NESTED object, so a
 * shallow spread would let a stored `{ visibility: { mobile: false } }`
 * silently drop `desktop` to `undefined` — which evaluates falsy and
 * would hide the widget on desktop too. A second merge keeps each
 * flag's default unless explicitly overridden.
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

/* ─────────────────────────────────────────────────────────────────────
 * GLOBAL WIDGET REFERENCE — US 8.1 ("Global Blocks")
 * ─────────────────────────────────────────────────────────────────────
 * When a cell's content carries `__global_ref: <uuid>`, the frontend
 * MUST resolve that id against the `global_widgets` table and render
 * the widget using the GLOBAL data instead of the local content.
 *
 * WHY a reserved key on `content` (mirroring `__design` from US 6.1):
 * Storing the reference inside `content` means it travels with the
 * widget through every existing pipeline (drag-and-drop swap, page
 * duplication, JSON snapshot, the v1↔v2 migration). Putting it on the
 * row itself would couple "is global?" to ALL columns of a row — but
 * a single row may want one global cell next to a local cell.
 *
 * Local data takes a backseat: when `__global_ref` is set we IGNORE
 * everything else in `content` for rendering purposes, but we KEEP
 * `__design` (visual chrome lives at the call site, not in the source
 * of truth). This matches Gutenberg's behaviour: a reusable block can
 * carry per-instance margin overrides without breaking the link.
 * ───────────────────────────────────────────────────────────────────── */
export const GLOBAL_REF_KEY = "__global_ref" as const;

/** Read the global widget id from a cell's content blob, if present. */
export const readGlobalRef = (
  content: Record<string, any> | null | undefined,
): string | null => {
  if (!content) return null;
  const v = (content as any)[GLOBAL_REF_KEY];
  return typeof v === "string" && v.length > 0 ? v : null;
};

/**
 * Build a content blob that points at a global widget. The reference
 * lives alongside `__design` so the per-instance Inspector overrides
 * survive — see WHY note above.
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

export interface ContactField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  visible: boolean;
}

export const DEFAULT_CONTACT_FIELDS: ContactField[] = [
  { key: "name", label: "Your name", type: "text", required: true, visible: true },
  { key: "email", label: "Email address", type: "email", required: true, visible: true },
  { key: "company", label: "Company", type: "text", required: false, visible: true },
  { key: "message", label: "Tell us about your vampire moment", type: "textarea", required: true, visible: true },
  { key: "marketing", label: "Keep me updated with insights and articles", type: "checkbox", required: false, visible: true },
];

export const generateRowId = () => crypto.randomUUID();

/* ─────────────────────────────────────────────────────────────────────
 * NESTED WIDGET ARCHITECTURE (v2 — schema for User Story 1.1)
 * ─────────────────────────────────────────────────────────────────────
 * Why this exists
 * ────────────────
 * The legacy `PageRow` couples a single `type` (hero, text, contact…)
 * to a single content blob. To compose mixed layouts (e.g. an image
 * next to a contact form) we'd previously have had to invent a new row
 * type for every combination. Instead we introduce a generic shape:
 *
 *   PageRowV2
 *     └── columns: PageColumn[]            // 1..N columns per row
 *           └── widgets: PageWidget[]      // 1..N widgets per column
 *                 └── { type, data }       // a single content unit
 *
 * Any existing row "type" maps cleanly onto a PageWidget — the row
 * itself becomes a pure layout container.
 *
 * Layout presets
 * ──────────────
 * `layout` is a short string token describing the column distribution
 * (e.g. "100", "50-50", "33-33-33", "60-40"). The renderer translates
 * this into a CSS grid template. Custom widths can still be supplied
 * via `column_widths` for fine-grained control.
 *
 * IMPORTANT: This is a forward-looking schema. The existing renderers
 * still consume the legacy `PageRow` shape. Use `migrateRowToV2()` to
 * convert on read until renderers are updated in a later story.
 * ───────────────────────────────────────────────────────────────────── */

export type WidgetType = PageRow["type"];

export interface PageWidget<TType extends string = WidgetType> {
  id: string;
  type: TType;
  data: Record<string, any>;
}

export interface PageColumn {
  id: string;
  widgets: PageWidget[];
}

export type ColumnLayoutPreset =
  | "100"
  | "50-50"
  | "33-33-33"
  | "25-25-25-25"
  | "60-40"
  | "40-60"
  | "70-30"
  | "30-70"
  | "custom";

export interface PageRowV2 {
  id: string;
  /** Schema version marker so the migration is idempotent. */
  schema_version: 2;
  strip_title: string;
  bg_color: string;
  scope?: string;
  layout?: RowLayout;
  /** Column distribution preset (or "custom" when widths drive it). */
  column_layout: ColumnLayoutPreset;
  columns: PageColumn[];
}

/** Type guard — true when a row already uses the v2 nested shape. */
export const isPageRowV2 = (row: any): row is PageRowV2 =>
  !!row && row.schema_version === 2 && Array.isArray(row.columns);

/** Derive a `ColumnLayoutPreset` token from numeric widths. */
const widthsToPreset = (widths: number[]): ColumnLayoutPreset => {
  const key = widths.map((w) => Math.round(w)).join("-");
  const known: Record<string, ColumnLayoutPreset> = {
    "100": "100",
    "50-50": "50-50",
    "33-33-33": "33-33-33",
    "25-25-25-25": "25-25-25-25",
    "60-40": "60-40",
    "40-60": "40-60",
    "70-30": "70-30",
    "30-70": "30-70",
  };
  return known[key] || "custom";
};

/**
 * Migrate a legacy `PageRow` to the new nested `PageRowV2` shape.
 * Lossless: the row's `content` (and any `columns_data`) become widgets
 * inside the corresponding columns, preserving the original `type`.
 */
export const migrateRowToV2 = (row: PageRow | PageRowV2): PageRowV2 => {
  if (isPageRowV2(row)) return row;

  const legacy = row as PageRow;
  const contents = [legacy.content || {}, ...(legacy.columns_data || [])];
  const widths =
    legacy.layout?.column_widths ||
    contents.map(() => Math.round(100 / Math.max(contents.length, 1)));

  const columns: PageColumn[] = contents.map((data) => ({
    id: generateRowId(),
    widgets: [
      {
        id: generateRowId(),
        type: legacy.type,
        data: data || {},
      },
    ],
  }));

  return {
    id: legacy.id,
    schema_version: 2,
    strip_title: legacy.strip_title,
    bg_color: legacy.bg_color,
    scope: legacy.scope,
    layout: legacy.layout,
    column_layout: widthsToPreset(widths),
    columns,
  };
};

/**
 * Migrate an entire `site_content` payload that contains `{ rows: [...] }`.
 * Safe to call on already-migrated payloads (idempotent).
 */
export const migrateSiteContentRows = <T extends { rows?: any[] } | null | undefined>(
  payload: T,
): T => {
  if (!payload || !Array.isArray((payload as any).rows)) return payload;
  const migrated = (payload as any).rows.map((r: any) => migrateRowToV2(r));
  return { ...(payload as any), rows: migrated } as T;
};

/** Get all column contents and their grid widths */
export const getRowColumns = (row: PageRow) => {
  const contents = [row.content, ...(row.columns_data || [])];
  const widths = row.layout?.column_widths || contents.map(() => Math.round(100 / contents.length));
  return { contents, widths, isMultiCol: contents.length > 1 };
};

export const multiColGridStyle = (widths: number[]): React.CSSProperties => ({
  display: "grid",
  gridTemplateColumns: widths.map((w) => `${w}fr`).join(" "),
  gap: "2rem",
});

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
