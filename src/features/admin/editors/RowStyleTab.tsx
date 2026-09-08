/**
 * ─────────────────────────────────────────────────────────────────────────
 * RowStyleTab.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * The "Style" sub-tab inside the Properties panel for any row-type
 * selection (text, boxed, service, contact, image_text, profile, grid,
 * lead_magnet). It does NOT show for the standalone "Hero" section —
 * that one uses `<StyleTab />` instead.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * UI HIERARCHY — ACCORDION ORGANIZATION (Junior-Engineer Guide)
 * ─────────────────────────────────────────────────────────────────────────
 * Every visual control is grouped into a single "Design & Background"
 * accordion (open by default — this entire tab is about design, so the
 * user always wants its contents visible on first render). Inside that
 * group the controls follow a deliberate top-to-bottom order:
 *
 *   1. Background color & opacity        (most-tweaked)
 *   2. Background image & opacity        (set once, rarely changed)
 *   3. Row internal alignment            (positioning of children)
 *   4. Column-width control              (only if multi-column)
 *   5. Gradient editor                   (decorative overlay)
 *   6. Decorative overlays               (glows, blobs, etc.)
 *
 * WHERE TO ADD A NEW STYLE FIELD
 * ──────────────────────────────
 *   • Anything that affects how the ROW renders visually (background,
 *     spacing, gradient, overlay, layout) → add INSIDE the
 *     "Design & Background" AccordionContent below.
 *   • Anything that affects per-content COPY appearance (a card title
 *     color, an eyebrow color tied to a specific block) → goes in
 *     `RowContentEditor.tsx` under its "Design & Background" item, NOT
 *     here. Rule of thumb: row-level → here, column-level → there.
 *
 * If a future redesign needs to split this into multiple groups (e.g.
 * "Background", "Layout", "Effects"), copy the AccordionItem pattern
 * from `RowContentEditor.tsx` and add additional <AccordionItem>s.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * STYLES — INLINE → TAILWIND
 * Inline styles that REMAIN are the ones that legitimately must stay
 * inline because the value is dynamic and Tailwind has no native
 * equivalent (e.g. `accentColor` on `<input type=range>`).
 * ─────────────────────────────────────────────────────────────────────────
 */

import RowAlignmentSettings from "../site-editor/RowAlignmentSettings";
import { ColorField } from "../site-editor/FieldComponents";
import ImagePickerField from "../ImagePickerField";
import ColumnWidthControl from "../site-editor/ColumnWidthControl";

import OverlayEditor from "../site-editor/OverlayEditor";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { PageRow, SectionShapeConfig, SectionShapeKind, SectionShapeSize } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/lib/constants/rowDefaults";
import { ROW_HEIGHT_MODES } from "@/lib/rowHeight";
import { DEFAULT_PAGE_MESH, buildPageMeshCSS } from "@/features/site/pageMesh";

interface Props {
  row: PageRow;
  onRowMetaChange: (updates: Partial<PageRow>) => void;
  onUpdateColumnWidths: (widths: number[]) => void;
}


/* Quick colours for the row background. "None" leaves the row
   transparent so the single page-wide mesh gradient shows through. */
const BG_PRESETS: { value: string; label: string; swatch: string }[] = [
  { value: "", label: "None", swatch: "linear-gradient(135deg,#F6EFF7,#FBF6EA)" },
  { value: "#FFFFFF", label: "White", swatch: "#FFFFFF" },
  { value: "#F4ECF6", label: "Plum", swatch: "#F4ECF6" },
  { value: "#2B0E33", label: "Ink", swatch: "#2B0E33" },
  { value: "#FAF5E9", label: "Cream", swatch: "#FAF5E9" },
];

// Mirrors the trigger style used in RowContentEditor for visual parity
// across the Properties panel. Update both files together if redesigning.
const TRIGGER_CLASS =
  "py-2.5 px-3 rounded-md bg-muted/30 hover:bg-muted/50 hover:no-underline " +
  "font-body text-[10px] uppercase tracking-[0.12em] text-foreground";

const CONTENT_CLASS = "pt-3 pb-1";

/* ─── Section shape picker ────────────────────────────────────────────
 * Shapes the row's top or bottom edge. "None" is the default; sizes are
 * subtle / medium / dramatic (all flatten on mobile). `flip` mirrors the
 * shape horizontally, which matters most for the angled cut.           */
const SHAPE_KINDS: [SectionShapeKind, string][] = [
  ["none", "None"],
  ["rounded", "Rounded"],
  ["wave", "Wave"],
  ["arch", "Arch"],
  ["angled", "Angled"],
  ["taper", "Taper"],
  ["notch", "Notch"],
];

const SHAPE_SIZES: [SectionShapeSize, string][] = [
  ["subtle", "Subtle"],
  ["medium", "Medium"],
  ["dramatic", "Dramatic"],
];

export const ShapePicker = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: SectionShapeConfig;
  onChange: (v: SectionShapeConfig | undefined) => void;
}) => {
  const kind = value?.kind ?? "none";
  const size = value?.size ?? "medium";
  return (
    <div>
      <label className="font-body text-[10px] uppercase tracking-wider mb-1 block text-muted-foreground">
        {label}
      </label>
      <div className="grid grid-cols-4 gap-1">
        {SHAPE_KINDS.map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k === "none" ? undefined : { ...value, kind: k, size })}
            className={`font-body text-[10px] py-2 rounded-lg border transition-colors ${
              kind === k
                ? "bg-secondary/15 border-secondary/40 text-foreground"
                : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      {kind !== "none" && (
        <div className="flex items-center gap-1 mt-1.5">
          {SHAPE_SIZES.map(([sz, l]) => (
            <button
              key={sz}
              type="button"
              onClick={() => onChange({ kind, size: sz, flip: value?.flip })}
              className={`flex-1 font-body text-[10px] py-1.5 rounded-lg border transition-colors ${
                size === sz
                  ? "bg-secondary/15 border-secondary/40 text-foreground"
                  : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {l}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange({ kind, size, flip: !value?.flip })}
            className={`font-body text-[10px] px-2.5 py-1.5 rounded-lg border transition-colors ${
              value?.flip
                ? "bg-secondary/15 border-secondary/40 text-foreground"
                : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
            }`}
          >
            Flip
          </button>
        </div>
      )}
    </div>
  );
};


const RowStyleTab = ({ row, onRowMetaChange, onUpdateColumnWidths }: Props) => {
  // ── Column count derivation ────────────────────────────────────────
  // v3 builder rows keep their real columns on `row.columns`; older rows
  // stored extra columns in `columns_data`. image_text & profile rows have
  // an INHERENT 2-zone split (image + text) even when both are empty.
  const builderColCount = Array.isArray((row as { columns?: unknown[] }).columns)
    ? ((row as { columns?: unknown[] }).columns as unknown[]).length
    : 0;
  const legacyColCount = 1 + (row.columns_data?.length || 0);
  const colCount = Math.max(builderColCount, legacyColCount);
  // Image+Text owns its internal Image/Text split in its Content editor.
  // Row-level widths must describe real builder columns only.
  const hasInherentSplit = row.type === "profile";
  const showWidthControl = colCount > 1 || hasInherentSplit;
  const widthColCount = hasInherentSplit && colCount === 1 ? 2 : colCount;
  const storedWidths = row.layout?.column_widths;
  const columnWidths =
    Array.isArray(storedWidths) && storedWidths.length === widthColCount
      ? storedWidths
      : Array(widthColCount).fill(Math.round(100 / widthColCount));


  const currentOverlays = row.layout?.overlays || [];

  // ── Background opacity ─────────────────────────────────────────────
  const bgColorOpacity = row.layout?.bgColorOpacity ?? 100;

  // ── Page mesh (hero rows only) ─────────────────────────────────────
  // The hero owns the single gradient painted behind the entire page.
  const isHero = row.type === "hero";
  const mesh = { ...DEFAULT_PAGE_MESH, ...(row.layout?.mesh || {}) };
  const meshColors = (mesh.colors?.length === 4 ? mesh.colors : DEFAULT_PAGE_MESH.colors) as string[];
  // ── Snap to viewport toggle ────────────────────────────────────────
  // Default OFF: only the Hero snaps. Admins opt-in for hero-class rows
  // (e.g. the Vows pledge) where a full-viewport reveal is desired.
  const snapEnabled = row.layout?.snapEnabled === true;

  const layout = row.layout || DEFAULT_ROW_LAYOUT;
  const patchLayout = (patch: Record<string, unknown>) =>
    onRowMetaChange({ layout: { ...layout, ...patch } });

  return (
    /* Two everyday groups (Surface, Edges) + everything else collapsed
       under Advanced, so the panel stops overwhelming non-technical
       editors who only ever change the band and the edge shape. */
    <Accordion type="multiple" defaultValue={["surface"]} className="space-y-2">
      {/* ═══ SURFACE ═══ */}
      <AccordionItem value="surface" className="border-none">
        <AccordionTrigger className={TRIGGER_CLASS}>Surface</AccordionTrigger>
        <AccordionContent className={CONTENT_CLASS}>
          <div className="flex flex-col gap-4">
            {/* ── Row background ──
                One page-wide mesh sits behind everything. A row is
                transparent by default; picking a colour paints it. */}
            <div>
              <label className="font-body text-[10px] uppercase tracking-wider mb-1 block text-muted-foreground">
                Row background
              </label>
              <div className="grid grid-cols-5 gap-1">
                {BG_PRESETS.map(({ value, label, swatch }) => {
                  const active = (row.bg_color || "") === value;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => onRowMetaChange({ bg_color: value })}
                      title={label}
                      className={`flex flex-col items-center gap-1 py-1.5 rounded-lg border transition-colors ${
                        active
                          ? "bg-secondary/15 border-secondary/40 text-foreground"
                          : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full border border-border"
                        style={{ background: swatch }}
                      />
                      <span className="font-body text-[9px] leading-none">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Background Colour + opacity ── */}
            <div>
              <label className="font-body text-[10px] uppercase tracking-wider mb-1 block text-muted-foreground">
                Background Color
              </label>
              <div className="flex gap-1.5">
                <input
                  type="color"
                  value={row.bg_color || "#FFFFFF"}
                  onChange={(e) => onRowMetaChange({ bg_color: e.target.value })}
                  className="w-10 h-9 rounded border border-border cursor-pointer"
                />
                <input
                  value={row.bg_color || ""}
                  onChange={(e) => onRowMetaChange({ bg_color: e.target.value })}
                  placeholder="#FFFFFF"
                  className="flex-1 px-3 py-2 rounded-lg font-body text-sm border border-border bg-background text-foreground"
                />
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="font-body text-[9px] uppercase tracking-wider text-muted-foreground min-w-[50px]">
                  Opacity
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={bgColorOpacity}
                  onChange={(e) => patchLayout({ bgColorOpacity: Number(e.target.value) })}
                  className="flex-1"
                  style={{ accentColor: "hsl(var(--secondary))" }}
                />
                <span className="font-body text-[10px] text-foreground min-w-[32px] text-right">
                  {bgColorOpacity}%
                </span>
              </div>
            </div>

            {/* ── Page background (hero rows only) ──
                The hero owns the ONE gradient behind the whole page.
                Every other row sits transparent on top of it. */}
            {isHero && (
              <div className="pt-1 border-t border-border">
                <label className="font-body text-[10px] uppercase tracking-wider mb-1 mt-3 block text-muted-foreground">
                  Page background (whole page)
                </label>
                <div
                  className="h-14 rounded-lg border border-border mb-2"
                  style={{ background: buildPageMeshCSS(mesh) }}
                />
                <div className="grid grid-cols-4 gap-1.5">
                  {meshColors.map((c, i) => (
                    <input
                      key={i}
                      type="color"
                      value={c}
                      aria-label={`Page background colour ${i + 1}`}
                      onChange={(e) => {
                        const next = [...meshColors];
                        next[i] = e.target.value;
                        patchLayout({ mesh: { ...mesh, colors: next } });
                      }}
                      className="w-full h-9 rounded border border-border cursor-pointer"
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="font-body text-[9px] uppercase tracking-wider text-muted-foreground min-w-[50px]">
                    Intensity
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={mesh.strength}
                    onChange={(e) => patchLayout({ mesh: { ...mesh, strength: Number(e.target.value) } })}
                    className="flex-1"
                    style={{ accentColor: "hsl(var(--secondary))" }}
                  />
                  <span className="font-body text-[10px] text-foreground min-w-[32px] text-right">
                    {mesh.strength}%
                  </span>
                </div>
                {/* Motion: aurora curtains flow and each crosses to a second
                    brand hue and back. Grain: film-grain sheet over the wash. */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="font-body text-[9px] uppercase tracking-wider text-muted-foreground min-w-[50px]">
                    Motion
                  </span>
                  <div className="flex-1 grid grid-cols-3 gap-1">
                    {([["off", "Off"], ["calm", "Calm"], ["lively", "Lively"]] as const).map(([value, label]) => {
                      const active = (mesh.motion || "calm") === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => patchLayout({ mesh: { ...mesh, motion: value } })}
                          className={`font-body text-[10px] py-1.5 rounded-lg border transition-colors ${
                            active
                              ? "bg-secondary/15 border-secondary/40 text-foreground"
                              : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="font-body text-[9px] uppercase tracking-wider text-muted-foreground min-w-[50px]">
                    Grain
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={mesh.grain ?? DEFAULT_PAGE_MESH.grain ?? 0}
                    onChange={(e) => patchLayout({ mesh: { ...mesh, grain: Number(e.target.value) } })}
                    className="flex-1"
                    style={{ accentColor: "hsl(var(--secondary))" }}
                  />
                  <span className="font-body text-[10px] text-foreground min-w-[32px] text-right">
                    {mesh.grain ?? DEFAULT_PAGE_MESH.grain ?? 0}%
                  </span>
                </div>
                <p className="font-body text-[10px] text-muted-foreground leading-snug mt-1">
                  The four colours flow across the page as aurora curtains, each breathing to a second
                  brand hue and back. Grain stays almost still so the colours carry the motion.
                  Visitors who prefer reduced motion always see it still.
                </p>
                <button
                  type="button"
                  onClick={() => patchLayout({ mesh: DEFAULT_PAGE_MESH })}
                  className="mt-2 font-body text-[10px] underline text-muted-foreground hover:text-foreground"
                >
                  Reset to brand default
                </button>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* ═══ LAYOUT RATIOS ═══
          How wide each block sits next to the others in this row. */}
      {showWidthControl ? (
        <AccordionItem value="ratios" className="border-none">
          <AccordionTrigger className={TRIGGER_CLASS}>Layout ratios</AccordionTrigger>
          <AccordionContent className={CONTENT_CLASS}>
            <ColumnWidthControl
              columnCount={widthColCount}
              widths={columnWidths}
              onChange={onUpdateColumnWidths}
              labels={hasInherentSplit ? ["Image side", "Text side"] : undefined}
              defaultOpen
            />
          </AccordionContent>
        </AccordionItem>
      ) : null}



      {/* ═══ BLOCK ALIGNMENT ═══
          Symmetry between blocks sitting side by side, plus optional
          numbered labels above each block. */}
      {colCount > 1 ? (
        <AccordionItem value="blocks" className="border-none">
          <AccordionTrigger className={TRIGGER_CLASS}>Blocks side by side</AccordionTrigger>
          <AccordionContent className={CONTENT_CLASS}>
            <div className="flex flex-col gap-3">
              <div>
                <label className="font-body text-[10px] uppercase tracking-wider mb-1 block text-muted-foreground">
                  Vertical alignment
                </label>
                <div className="grid grid-cols-2 gap-1">
                  {([
                    { value: "stretch", label: "Matched heights" },
                    { value: "top", label: "Uneven" },
                  ] as const).map(({ value, label }) => {
                    const active = (row.layout?.blockAlign || "stretch") === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => patchLayout({ blockAlign: value })}
                        className={`px-2 py-1.5 rounded-md font-body text-[11px] border ${active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="font-body text-[10px] uppercase tracking-wider mb-1 block text-muted-foreground">
                  Column gap
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {([
                    ["tight", "Tight"],
                    ["normal", "Normal"],
                    ["wide", "Wide"],
                  ] as const).map(([value, label]) => {
                    const active = (row.layout?.columnGap || "normal") === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => patchLayout({ columnGap: value })}
                        className={`font-body text-[10px] py-2 rounded-lg border transition-colors ${
                          active
                            ? "bg-secondary/15 border-secondary/40 text-foreground"
                            : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="flex items-center gap-2 font-body text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={row.layout?.numberBlocks === true}
                  onChange={(e) => patchLayout({ numberBlocks: e.target.checked })}
                />
                Number the blocks (01, 02, 03…)
              </label>
            </div>
          </AccordionContent>
        </AccordionItem>
      ) : null}

      {/* ═══ CORNERS ═══
          Rounding of the band this row paints around all of its blocks. */}
      <AccordionItem value="corners" className="border-none">
        <AccordionTrigger className={TRIGGER_CLASS}>Corners</AccordionTrigger>
        <AccordionContent className={CONTENT_CLASS}>
          <div className="grid grid-cols-4 gap-1">
            {([
              ["none", "Square"],
              ["subtle", "Subtle"],
              ["medium", "Medium"],
              ["dramatic", "Large"],
            ] as const).map(([value, label]) => {
              const active = (row.layout?.surfaceRadius || "none") === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => patchLayout({ surfaceRadius: value })}
                  className={`font-body text-[10px] py-2 rounded-lg border transition-colors ${
                    active
                      ? "bg-secondary/15 border-secondary/40 text-foreground"
                      : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="font-body text-[10px] text-muted-foreground leading-snug mt-2">
            Corners round this row's own box — they stay inside the row. Edges
            (below) are curves that spill over the row above or below. An edge
            with a shape keeps its own curve and ignores the corner setting, so
            the two never clash.
          </p>

          {/* ── Outline ──
              The ink line drawn on this row's set edges (and inherited by
              everything inside it: lip, cover picture, image frames,
              boxes). Empty = the site default from Brand ▸ Outline. */}
          <div className="mt-4 pt-3 border-t border-border/60 space-y-2">
            <span className="font-body text-[9px] uppercase tracking-wider text-muted-foreground block">
              Outline (this row)
            </span>
            <ColorField
              label="Outline colour"
              description="Leave empty for the site default (Brand ▸ Outline)."
              value={row.layout?.outlineColor || ""}
              fallback="site default"
              onChange={(v) => patchLayout({ outlineColor: v.trim() || undefined })}
            />
            <div className="flex items-center gap-2">
              <span className="font-body text-[9px] uppercase tracking-wider text-muted-foreground min-w-[70px]">
                Width
              </span>
              <input
                type="number"
                min={0}
                max={12}
                step={1}
                placeholder="default"
                value={row.layout?.outlineWidth ?? ""}
                onChange={(e) =>
                  patchLayout({
                    outlineWidth: e.target.value === "" ? undefined : Math.max(0, Math.min(12, Number(e.target.value))),
                  })
                }
                className="w-20 px-2 py-1 rounded border border-border bg-background font-body text-xs"
              />
              <span className="font-body text-[10px] text-muted-foreground">px · 0 hides it · empty = site default</span>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>



      {/* ═══ ROW COVER IMAGE ═══
          One picture for the WHOLE row (all of its blocks), spanning the
          full width and inheriting the row's corner curve. */}
      <AccordionItem value="cover" className="border-none">
        <AccordionTrigger className={TRIGGER_CLASS}>Row cover image</AccordionTrigger>
        <AccordionContent className={CONTENT_CLASS}>
          <div className="flex flex-col gap-3">
            <ImagePickerField
              label="Cover image (optional)"
              value={row.layout?.coverImage || ""}
              onChange={(v) => patchLayout({ coverImage: v })}
              altValue={row.layout?.coverImageAlt || ""}
              onAltChange={(v) => patchLayout({ coverImageAlt: v })}
              ratio={row.layout?.coverImageRatio || "original"}
              focalX={row.layout?.coverFocalX}
              focalY={row.layout?.coverFocalY}
              onShapeChange={(patch) => {
                const next: Record<string, unknown> = {};
                if (patch.ratio !== undefined) next.coverImageRatio = patch.ratio;
                if (patch.focalX !== undefined) next.coverFocalX = patch.focalX;
                if (patch.focalY !== undefined) next.coverFocalY = patch.focalY;
                patchLayout(next);
              }}
            />
            {row.layout?.coverImage ? (
              <>
                <div>
                  <label className="font-body text-[10px] uppercase tracking-wider mb-1 block text-muted-foreground">
                    Style
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    {([
                      ["fade", "Fade into row"],
                      ["fill", "Plain banner"],
                    ] as const).map(([value, label]) => {
                      const active = (row.layout?.coverMode || "fade") === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => patchLayout({ coverMode: value })}
                          className={`font-body text-[10px] py-2 rounded-lg border transition-colors ${
                            active
                              ? "bg-secondary/15 border-secondary/40 text-foreground"
                              : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="font-body text-[10px] uppercase tracking-wider mb-1 block text-muted-foreground">
                    Cover height
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {([
                      ["small", "Small"],
                      ["medium", "Medium"],
                      ["large", "Large"],
                    ] as const).map(([value, label]) => {
                      const active = (row.layout?.coverHeight || "small") === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => patchLayout({ coverHeight: value })}
                          className={`font-body text-[10px] py-2 rounded-lg border transition-colors ${
                            active
                              ? "bg-secondary/15 border-secondary/40 text-foreground"
                              : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="font-body text-[10px] uppercase tracking-wider mb-1 block text-muted-foreground">
                    Focal point
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-body text-[9px] uppercase tracking-wider text-muted-foreground block mb-1">
                        Horizontal
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={row.layout?.coverFocalX ?? 50}
                        onChange={(e) => patchLayout({ coverFocalX: Number(e.target.value) })}
                        className="w-full"
                        style={{ accentColor: "hsl(var(--secondary))" }}
                      />
                    </div>
                    <div>
                      <span className="font-body text-[9px] uppercase tracking-wider text-muted-foreground block mb-1">
                        Vertical
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={row.layout?.coverFocalY ?? 50}
                        onChange={(e) => patchLayout({ coverFocalY: Number(e.target.value) })}
                        className="w-full"
                        style={{ accentColor: "hsl(var(--secondary))" }}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-body text-[9px] uppercase tracking-wider text-muted-foreground min-w-[70px]">
                      Text over picture
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={90}
                      step={5}
                      value={row.layout?.coverTextOverlapPct ?? 60}
                      onChange={(e) => patchLayout({ coverTextOverlapPct: Number(e.target.value) })}
                      className="flex-1"
                      style={{ accentColor: "hsl(var(--secondary))" }}
                    />
                    <span className="font-body text-[10px] text-foreground min-w-[36px] text-right">
                      {row.layout?.coverTextOverlapPct ?? 60}%
                    </span>
                  </div>
                  <p className="font-body text-[10px] text-muted-foreground leading-snug mt-1">
                    How far the text climbs up over the picture, as a share of the
                    picture's height. Around a third puts the first lines on the
                    fading image; the picture fades to nothing at its bottom edge.
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* ═══ HEIGHT ═══ */}
      <AccordionItem value="height" className="border-none">
        <AccordionTrigger className={TRIGGER_CLASS}>Height</AccordionTrigger>
        <AccordionContent className={CONTENT_CLASS}>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-1">
              {ROW_HEIGHT_MODES.map(([value, label]) => {
                const active = (row.layout?.heightMode || "auto") === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => patchLayout({ heightMode: value })}
                    className={`font-body text-[10px] py-2 rounded-lg border transition-colors ${
                      active
                        ? "bg-secondary/15 border-secondary/40 text-foreground"
                        : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {row.layout?.heightMode === "custom" ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={row.layout?.heightValue ?? 50}
                  onChange={(e) => patchLayout({ heightValue: Number(e.target.value) })}
                  className="w-24 font-body text-xs px-2 py-1.5 rounded-lg border border-border bg-background text-foreground"
                />
                <div className="grid grid-cols-2 gap-1">
                  {(["vh", "px"] as const).map((unit) => {
                    const active = (row.layout?.heightUnit || "vh") === unit;
                    return (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => patchLayout({ heightUnit: unit })}
                        className={`font-body text-[10px] px-3 py-1.5 rounded-lg border transition-colors ${
                          active
                            ? "bg-secondary/15 border-secondary/40 text-foreground"
                            : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        {unit}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {row.type === "image" ? (
              <>
                <label className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-2">
                  <span className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">
                    Full bleed
                  </span>
                  <input
                    type="checkbox"
                    checked={row.layout?.fullBleed !== false}
                    onChange={(e) => patchLayout({ fullBleed: e.target.checked })}
                    style={{ accentColor: "hsl(var(--secondary))" }}
                  />
                </label>

                {(row.layout?.heightMode || "auto") !== "auto" ? (
                  <div>
                    <label className="font-body text-[10px] uppercase tracking-wider mb-1 block text-muted-foreground">
                      Focal point
                    </label>
                    <div className="grid grid-cols-5 gap-1">
                      {(["top", "center", "bottom", "left", "right"] as const).map((point) => {
                        const active = (row.layout?.focalPoint || "center") === point;
                        return (
                          <button
                            key={point}
                            type="button"
                            onClick={() => patchLayout({ focalPoint: point })}
                            className={`font-body text-[10px] py-1.5 rounded-lg border capitalize transition-colors ${
                              active
                                ? "bg-secondary/15 border-secondary/40 text-foreground"
                                : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                            }`}
                          >
                            {point}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}

            <p className="font-body text-[10px] text-muted-foreground leading-snug">
              Sets a minimum height — longer content still grows past it, so
              nothing ever gets cut off.
            </p>

          </div>
        </AccordionContent>
      </AccordionItem>


      {/* ═══ EDGES ═══ */}
      <AccordionItem value="edges" className="border-none">
        <AccordionTrigger className={TRIGGER_CLASS}>Edges &amp; separators</AccordionTrigger>
        <AccordionContent className={CONTENT_CLASS}>
          <div className="flex flex-col gap-3">
            <div>
              <label className="font-body text-[10px] uppercase tracking-wider mb-1 block text-muted-foreground">
                Top separator line
              </label>
              <div className="grid grid-cols-3 gap-1">
                {([
                  ["none", "None"],
                  ["full", "Full width"],
                  ["content", "Content width"],
                ] as const).map(([value, label]) => {
                  const active = (row.layout?.dividerTop || "none") === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => patchLayout({ dividerTop: value })}
                      className={`font-body text-[10px] py-2 rounded-lg border transition-colors ${
                        active
                          ? "bg-secondary/15 border-secondary/40 text-foreground"
                          : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {!row.bg_color ? (
              <p className="font-body text-[10px] text-muted-foreground leading-snug">
                Pick a row colour under Surface to use a shaped edge — a
                transparent row has no surface to spill over its neighbour.
              </p>
            ) : null}
            <ShapePicker
              label="Shape — top edge"
              value={row.layout?.shapeTop}
              onChange={(shapeTop) => patchLayout({ shapeTop })}
            />
            <ShapePicker
              label="Shape — bottom edge"
              value={row.layout?.shapeBottom}
              onChange={(shapeBottom) => patchLayout({ shapeBottom })}
            />
            <p className="font-body text-[10px] text-muted-foreground leading-snug">
              The shape is painted in this row's own colour and sits over the
              neighbouring section — the top edge spills up over the row
              above, the bottom edge down over the row below.
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* ═══ ADVANCED ═══ */}
      <AccordionItem value="advanced" className="border-none">
        <AccordionTrigger className={TRIGGER_CLASS}>Advanced</AccordionTrigger>
        <AccordionContent className={CONTENT_CLASS}>
          <div className="flex flex-col gap-4">
            {/* Hero rows manage their own internal alignment elsewhere. */}
            {row.type !== "hero" && (
              <RowAlignmentSettings
                layout={layout}
                onChange={(l) => onRowMetaChange({ layout: l })}
              />
            )}


            {/* ── Snap to viewport ── */}
            <div>
              <label className="font-body text-[10px] uppercase tracking-wider mb-1 block text-muted-foreground">
                Scroll Snap
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={snapEnabled}
                onClick={() => patchLayout({ snapEnabled: !snapEnabled })}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-colors ${
                  snapEnabled
                    ? "bg-secondary/15 border-secondary/40"
                    : "bg-muted/30 border-border hover:bg-muted/50"
                }`}
              >
                <span className="font-body text-xs text-foreground">
                  Snap this row to the viewport
                </span>
                <span
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                    snapEnabled ? "bg-secondary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-card shadow transition-transform ${
                      snapEnabled ? "translate-x-[18px]" : "translate-x-0.5"
                    }`}
                  />
                </span>
              </button>
              <p className="font-body text-[10px] text-muted-foreground mt-1 leading-snug">
                Off by default. Turn on for hero-class rows (e.g. Vows) where
                a full-viewport reveal is desired.
              </p>
            </div>




            <OverlayEditor
              overlays={currentOverlays}
              onChange={(overlays) => patchLayout({ overlays })}
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};


export default RowStyleTab;
