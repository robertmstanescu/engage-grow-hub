/**
 * Page-builder type declarations.
 *
 * This module is the single source of truth for the *shape* of every
 * piece of page-builder data — rows, columns, cells, widgets, gradient
 * configs, design overrides and the typed sub-shapes for individual
 * widget content blobs. It contains TYPES ONLY (plus the cheap
 * structural type guards that operate on those types).
 *
 * Anything else lives elsewhere:
 *   • Default values & seed data → `@/lib/constants/rowDefaults`
 *   • Migrations between versions → `@/lib/migrations/rowMigrations`
 */

/* ─── Page mesh ─────────────────────────────────────────────────────
 * The site has ONE background: a fixed mesh gradient painted behind
 * every page. Its four colour blobs and overall intensity are owned by
 * the page's Hero row (Style ▸ Page background), so an admin tunes the
 * whole page's atmosphere in one place. Rows are transparent unless
 * they carry a plain `bg_color`.                                     */

export interface PageMeshConfig {
  /** Four blob colours, clockwise from top-left. Hex values. */
  colors: [string, string, string, string];
  /** Overall intensity, 0–100. */
  strength: number;
  /**
   * How the mesh moves: blobs drift and each one slowly crosses to a
   * second brand hue and back, so the page's colours shift over time.
   * "off" freezes it. Reduced-motion users always get "off".
   */
  motion?: "off" | "calm" | "lively";
  /** Film grain over the mesh, 0–100 (0 = none). */
  grain?: number;
}

/* ─── Gradient (legacy shape, kept for stored data compatibility) ──── */

export type GradientType = "linear" | "radial" | "conic" | "mesh";

export interface GradientStop {
  /** Hex or rgb/rgba colour. */
  color: string;
  /** Position along the gradient track, 0–100. */
  position: number;
  /** Optional alpha, 0–100. Defaults to fully opaque. */
  alpha?: number;
}

export interface GradientConfig {
  type: GradientType;
  /** Used by linear/conic gradients. 0–360. */
  angle: number;
  radialShape?: "circle" | "ellipse";
  /** CSS keyword or `<x> <y>` for radial gradients (e.g. "center"). */
  radialPosition?: string;
  stops: GradientStop[];
  /** Master switch — when false the legacy bg colour is used instead. */
  enabled: boolean;
}

/* ─── Overlays ─────────────────────────────────────────────────────── */

export type OverlayFit = "fit" | "fill" | "original";
export type OverlayAnchor =
  | "top-left" | "top-center" | "top-right"
  | "middle-left" | "middle-center" | "middle-right"
  | "bottom-left" | "bottom-center" | "bottom-right";
export type BlendMode =
  | "normal" | "multiply" | "screen" | "overlay" | "soft-light"
  | "hard-light" | "color-dodge" | "color-burn" | "difference"
  | "exclusion" | "luminosity";

export interface OverlayElement {
  id: string;
  url: string;
  fit: OverlayFit;
  anchor: OverlayAnchor;
  /** 0–100. */
  opacity: number;
  /** Degrees, 0–360. */
  rotation: number;
  blendMode: BlendMode;
}

/* ─── Row layout chrome ────────────────────────────────────────────── */

export interface RowLayout {
  columns: 1 | 2 | 3 | 4;
  /** Proportional column widths (e.g. `[60, 40]`). */
  column_widths?: number[];
  fullWidth: boolean;
  paddingTop: number;
  paddingBottom: number;
  marginTop: number;
  marginBottom: number;
  /** 0–100, applied to `row.bg_color`. */
  bgColorOpacity?: number;
  alignment?: "auto" | "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  overlays?: OverlayElement[];
  /**
   * Page-wide mesh gradient. Only read from the page's HERO row: the
   * hero owns the single fixed gradient painted behind the whole page
   * (see `.page-mesh-layer`). Other rows ignore it.
   */
  mesh?: PageMeshConfig;
  carouselTheme?: "auto" | "light" | "dark";
  /**
   * When true, this row participates in the homepage scroll-snap. By
   * default only the Hero snaps; other rows free-scroll inside the
   * 18px row-fluid breathing strip. Admins can opt rows back in (e.g.
   * the Vows row) via the Style tab.
   */
  snapEnabled?: boolean;
  /**
   * Row height. "auto" (default) sizes to content; the presets and the
   * custom value are applied as a MIN height so content never clips.
   */
  heightMode?: "auto" | "small" | "medium" | "large" | "full" | "custom";
  /** Numeric value used when `heightMode` is "custom". */
  heightValue?: number;
  /** Unit for the custom height. Defaults to vh. */
  heightUnit?: "vh" | "px";
  /** Decorative shape on the row's top edge. */
  shapeTop?: SectionShapeConfig;
  /** Decorative shape on the row's bottom edge. */
  shapeBottom?: SectionShapeConfig;
  /**
   * Hairline separator drawn along the row's top edge. Off by default.
   * "full" spans the viewport, "content" is inset to the row container
   * so it lines up with the text column.
   */
  dividerTop?: "none" | "full" | "content";
  /**
   * Edge-to-edge row: drops the content container's max-width and the
   * row's vertical padding so the content (typically an image) becomes a
   * full-bleed page breaker. Image rows default to true.
   */
  fullBleed?: boolean;
  /** Which part of a cropped image stays visible when a height is set. */
  focalPoint?: "top" | "center" | "bottom" | "left" | "right";
  /**
   * Optional cover picture for the WHOLE row (all widgets), painted by
   * the row-level surface — full width, row corner radius.
   */
  coverImage?: string;
  /** Alt text for `coverImage`. */
  coverImageAlt?: string;
  /** "fade" (default) dissolves into the row colour; "fill" is a plain banner. */
  coverMode?: "fade" | "fill";
  /**
   * How far (px) the row's content is pulled UP over a fading cover
   * image. Defaults to 64. Halved on small screens.
   */
  coverTextOverlap?: number;
  /**
   * How far the content climbs up over the cover picture, as a share of
   * the picture's rendered height (0–90, default 60). Replaces the pixel
   * field above, which the renderer no longer reads: "60% down the
   * picture" stays 60% at every band size and viewport, where a pixel
   * value does not.
   */
  coverTextOverlapPct?: number;
  /** Display ratio for the row-level cover image. */
  coverImageRatio?: string;
  /** Focal point for the row-level cover image (0-100). */
  coverFocalX?: number;
  coverFocalY?: number;
  /** Cover image height: small ≈ 40% of the old band, medium, large. */
  coverHeight?: "small" | "medium" | "large";
  /**
   * Corner rounding of the row's own painted surface (multi-widget rows
   * and rows with a cover image). Defaults to "medium". Corners next to
   * an assigned edge shape stay square — the shape cap curves them.
   */
  surfaceRadius?: "none" | "subtle" | "medium" | "dramatic";
  /**
   * Per-row override of the ink outline colour (CSS colour). Unset =
   * the site default from Brand settings ▸ Outline. Cascades to
   * everything inside the row: its lip, cover picture, image frames
   * and boxes.
   */
  outlineColor?: string;
  /** Per-row override of the outline width in px; 0 turns it off. */
  outlineWidth?: number;
  /**
   * How blocks sitting side by side in one row line up vertically.
   * "stretch" (default) gives the Ruul-style symmetry — every block,
   * picture included, fills the full row height so tops and bottoms
   * align. "top" keeps a looser, deliberately uneven arrangement.
   */
  blockAlign?: "stretch" | "top";
  /** Show a small "01", "02"… label above each block in this row. */
  numberBlocks?: boolean;
  /** Space between side-by-side columns. */
  columnGap?: "tight" | "normal" | "wide";
}



/* ─── Section shapes ───────────────────────────────────────────────── */

export type SectionShapeKind =
  | "none"
  | "rounded"
  | "wave"
  | "arch"
  | "angled"
  | "taper"
  | "notch";

export type SectionShapeSize = "subtle" | "medium" | "dramatic";

export interface SectionShapeConfig {
  kind: SectionShapeKind;
  size?: SectionShapeSize;
  /** Mirror the shape horizontally (e.g. angled leaning the other way). */
  flip?: boolean;
}


/* ─── Legacy single-type row (v1) ──────────────────────────────────── */

/**
 * Legacy row shape stored as JSON in `cms_pages.page_rows` and
 * `site_content.content.rows`. Each row pairs a single widget `type`
 * with a free-form `content` blob (and optional extra columns via
 * `columns_data`). All renderers and editors operate on the v3 shape;
 * this type is still exported so historical JSON deserialises.
 */
/**
 * Every row / widget type the page builder knows about — the ONE list.
 *
 * A type must be wired in three places to work end to end: a renderer
 * in the widget registry (`src/widgets/index.tsx`), an editor in
 * `RowTypeEditor`, and this list. `rowRegistry.test.ts` asserts all
 * three agree, so adding a type here without the other two (or the
 * other way round) fails `npm run check` instead of shipping a row that
 * renders blank or has no editor.
 */
export const ROW_TYPES = [
  "hero",
  "text",
  "service",
  "boxed",
  "contact",
  "image_text",
  "image",
  "profile",
  "grid",
  "lead_magnet",
  "testimonial",
  "logo_cloud",
  "faq",
  "proof_band",
  "process_steps",
  "quote_band",
  "cta_band",
] as const;

export type RowType = (typeof ROW_TYPES)[number];

export interface PageRow {
  id: string;
  type: RowType;
  strip_title: string;
  bg_color: string;
  scope?: string;
  layout?: RowLayout;
  content: Record<string, any>;
  /** Extra columns beyond the first; same shape as `content`. */
  columns_data?: Record<string, any>[];
  /**
   * Custom CSS scoped to this row. The renderer rewrites the `&`
   * token to a per-row selector before injecting a `<style>` block,
   * so rules cannot leak out of this row. Empty/undefined disables
   * injection entirely.
   */
  customCss?: string;
}

/* ─── Widget content sub-shapes ────────────────────────────────────── */

export interface TestimonialItem {
  /** Sanitised HTML (rich text). */
  quote: string;
  name: string;
  role?: string;
  /** Public image URL. */
  avatar?: string;
  avatar_alt?: string;
}

export interface FaqItem {
  question: string;
  /** Sanitised HTML (rich text). */
  answer: string;
}

export interface LogoCloudLogo {
  url: string;
  alt?: string;
}

/* ── Consulting-grade row shapes ──────────────────────────────────── */

/** One outcome stat (or client logo) in a Proof Band. */
export interface ProofItem {
  /** Big number / short claim, e.g. "38%" or "12 weeks". */
  value: string;
  /** Supporting line, e.g. "average lift in message recall". */
  label: string;
  /** Optional client logo shown instead of the value. */
  logo?: string;
  logo_alt?: string;
}

/** One numbered step in a "How we work" strip. */
export interface ProcessStep {
  title: string;
  /** Sanitised HTML (rich text). */
  description: string;
}



/* ─── Per-widget design overrides ──────────────────────────────────── */

/**
 * Generic visual chrome every widget inherits via the WidgetWrapper.
 * Stored under the reserved `__design` key on a widget's content blob
 * so legacy renderers ignore it. The wrapper applies these uniformly
 * so individual widgets need not re-implement spacing, background,
 * radius or visibility logic.
 */
export interface WidgetDesignSettings {
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  /** Background colour for the wrapper. Empty string = transparent. */
  bgColor: string;
  /** Border radius applied to all four corners (px). */
  borderRadius: number;
  /**
   * Responsive visibility flags. Tailwind's `md` (≥768px) is used as
   * the desktop threshold; below it counts as mobile.
   */
  visibility: {
    mobile: boolean;
    desktop: boolean;
  };
  /**
   * Per-widget custom CSS. The wrapper rewrites the `&` token to a
   * per-instance class so rules cannot leak globally. Empty string
   * disables injection.
   */
  customCss: string;
}

/* ─── Contact form fields ──────────────────────────────────────────── */

export interface ContactField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  visible: boolean;
}

/* ─── Nested widget architecture (v2 + v3) ─────────────────────────── */

/**
 * Discriminator for `PageWidget.type`. Mirrors `PageRow["type"]` —
 * any legacy row type maps cleanly to a single widget.
 */
export type WidgetType = PageRow["type"];

export interface PageWidget<TType extends string = WidgetType> {
  id: string;
  type: TType;
  data: Record<string, any>;
}

/* ─── Cell ─────────────────────────────────────────────────────────── */

export type CellDirection = "vertical" | "horizontal";
export type CellVAlign = "top" | "middle" | "bottom" | "stretch";
export type CellHAlign = "left" | "center" | "right" | "stretch";

export interface PageCellLayout {
  /** Stack widgets vertically (default) or horizontally inside the cell. */
  direction: CellDirection;
  /** Cross-axis alignment of widgets inside the cell. */
  verticalAlign: CellVAlign;
  /** Main-axis distribution of widgets inside the cell. */
  justify: CellHAlign;
  /** Gap between widgets in px. */
  gap: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  /** Optional minimum height in px. 0 = auto. */
  minHeight: number;
}

export interface PageCellStyle {
  /** Background colour. Empty string = transparent. */
  bgColor: string;
  borderRadius: number;
  /** Border colour. Empty string = no border. */
  borderColor: string;
  borderWidth: number;
  /** Optional class name appended to the cell wrapper. */
  customClass: string;
  /**
   * Scoped custom CSS. The `&` token is rewritten to
   * `.cell-scope-<id>` so rules cannot leak outside this cell.
   */
  customCss: string;
}

export interface PageCellSpan {
  /** Column-span — how many GRID columns this cell occupies. 1 = none. */
  col: number;
  /** Row-span — how many GRID rows this cell occupies. 1 = none. */
  row: number;
}

/**
 * A Cell is a styled container that lives between a Column and its
 * Widgets. It owns its own visual chrome, internal flex layout and
 * an optional grid span so a single cell can cover multiple columns
 * or rows. Empty cells stay valid (`widgets: []`); the builder paints
 * a "+" placeholder so editors can drop widgets into them.
 */
export interface PageCell {
  id: string;
  layout: PageCellLayout;
  style: PageCellStyle;
  span: PageCellSpan;
  widgets: PageWidget[];
}

/* ─── Column ───────────────────────────────────────────────────────── */

export interface PageColumn {
  id: string;
  /**
   * v3: columns hold cells. `cell_direction` controls whether multiple
   * cells stack vertically or sit side-by-side horizontally.
   */
  cell_direction?: CellDirection;
  cells?: PageCell[];
  /**
   * v2 backwards-compat — older columns expose `widgets` directly.
   * `migrateRowToV3` rewraps them into a single cell. Kept optional so
   * historical JSON deserialises without crashing.
   */
  widgets?: PageWidget[];
}

/** Short token describing a column distribution preset. */
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

/* ─── Row v2 / v3 ──────────────────────────────────────────────────── */

/** v2 row — columns own widgets directly. Use v3 for new code. */
export interface PageRowV2 {
  id: string;
  schema_version: 2;
  strip_title: string;
  bg_color: string;
  scope?: string;
  layout?: RowLayout;
  column_layout: ColumnLayoutPreset;
  columns: PageColumn[];
}

/** v3 row — columns own cells; cells own widgets. Canonical shape. */
export interface PageRowV3 {
  id: string;
  schema_version: 3;
  strip_title: string;
  bg_color: string;
  scope?: string;
  layout?: RowLayout;
  column_layout: ColumnLayoutPreset;
  columns: PageColumn[];
  /** Custom CSS scoped to this row. */
  customCss?: string;
}

/* ─── Type guards ──────────────────────────────────────────────────── */

/** True when the row already uses the v2-or-v3 nested shape. */
export const isPageRowV2 = (row: any): row is PageRowV2 | PageRowV3 =>
  !!row && (row.schema_version === 2 || row.schema_version === 3) && Array.isArray(row.columns);

/** True when the row uses the v3 shape (columns hold cells). */
export const isPageRowV3 = (row: any): row is PageRowV3 =>
  !!row && row.schema_version === 3 && Array.isArray(row.columns);
