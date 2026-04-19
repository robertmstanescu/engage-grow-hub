/**
 * ─────────────────────────────────────────────────────────────────────────
 * RowStyleTab.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * The "Style" sub-tab inside the Properties panel for any row-type
 * selection (text, boxed, service, contact, image_text, profile, grid,
 * lead_magnet). It does NOT show for the standalone "Hero" section —
 * that one uses `<StyleTab />` instead.
 *
 * It bundles together every row-level visual control:
 *   • Background colour (with opacity slider)
 *   • Background image URL (with opacity slider, only when an image is set)
 *   • Row-internal alignment (RowAlignmentSettings — except on hero rows)
 *   • Column-width control (ColumnWidthControl — visible whenever the row
 *     has more than one column or an "inherent" image+text/profile split)
 *   • Gradient editor (GradientEditor, with row-type-aware defaults)
 *   • Decorative overlays (OverlayEditor)
 *
 * PROPS
 * ─────
 *   row                  : PageRow
 *   onRowMetaChange      : (updates: Partial<PageRow>) => void
 *   onUpdateColumnWidths : (widths: number[]) => void
 *
 * WHY IT WAS EXTRACTED
 * ────────────────────
 * This was 100+ lines living inline at the bottom of AdminDashboard.tsx,
 * coupled to row-internal defaults that don't belong in an orchestration
 * file. Pulling it into editors/ makes the dashboard tab-mounting logic
 * (`propertiesSubTab === "style"`) trivial: it just renders one element.
 *
 * STYLES — INLINE → TAILWIND
 * ──────────────────────────
 * All static layout/typography styles converted to Tailwind utilities.
 * Inline styles that REMAIN are the ones that legitimately must remain
 * inline because the value is dynamic and Tailwind has no native
 * equivalent for them:
 *   • `style={{ accentColor: "hsl(var(--secondary))" }}` on `<input type=range>`
 *     — Tailwind has no built-in `accent-secondary` utility for CSS
 *       variable colours.
 *   • The bg colour input's `borderColor` could be `border-border`, and IS
 *     converted. The user-controlled colour preview block uses inline
 *     `value=` only (no inline style needed).
 *
 * The min-width pixel hints (`min-w-[50px]`, `min-w-[32px]`) came from
 * legacy `minWidth: 50` / `minWidth: 32` inline rules and are retained as
 * arbitrary-value Tailwind classes to keep visual parity exact.
 * ─────────────────────────────────────────────────────────────────────────
 */

import RowAlignmentSettings from "../site-editor/RowAlignmentSettings";
import ColumnWidthControl from "../site-editor/ColumnWidthControl";
import GradientEditor from "../site-editor/GradientEditor";
import OverlayEditor from "../site-editor/OverlayEditor";
import { DEFAULT_ROW_LAYOUT, type PageRow } from "@/types/rows";

interface Props {
  row: PageRow;
  onRowMetaChange: (updates: Partial<PageRow>) => void;
  onUpdateColumnWidths: (widths: number[]) => void;
}

/**
 * Per-row-type defaults for the gradient editor. We pre-populate the
 * widget with values that match the actual front-end render, so what the
 * admin sees in the editor === what's currently painting on the page.
 */
const ROW_DEFAULTS: Record<string, { start: string; end: string }> = {
  hero: { start: "hsl(280 55% 20% / 0.8)", end: "hsl(286 42% 25% / 0.5)" },
  text: { start: "hsl(280 55% 18% / 0.5)", end: "hsl(286 42% 20% / 0.3)" },
  service: { start: "hsl(286 42% 30%)", end: "hsl(280 55% 25%)" },
  boxed: { start: "hsl(280 55% 18% / 0.6)", end: "hsl(286 42% 20% / 0.4)" },
  contact: { start: "hsl(280 55% 24% / 0.3)", end: "transparent" },
  image_text: { start: "hsl(280 55% 20% / 0.5)", end: "hsl(286 42% 25% / 0.3)" },
  profile: { start: "hsl(280 55% 20% / 0.5)", end: "hsl(286 42% 25% / 0.3)" },
  grid: { start: "hsl(280 55% 20% / 0.5)", end: "hsl(286 42% 25% / 0.3)" },
};

const RowStyleTab = ({ row, onRowMetaChange, onUpdateColumnWidths }: Props) => {
  // ── Column count derivation ────────────────────────────────────────
  // image_text & profile rows have an INHERENT 2-zone split (image + text)
  // even when columns_data is empty, so we always show the width control
  // for them with at least 2 zones.
  const colCount = 1 + (row.columns_data?.length || 0);
  const hasInherentSplit = row.type === "image_text" || row.type === "profile";
  const showWidthControl = colCount > 1 || hasInherentSplit;
  const widthColCount = hasInherentSplit && colCount === 1 ? 2 : colCount;
  const columnWidths =
    row.layout?.column_widths || Array(widthColCount).fill(Math.round(100 / widthColCount));

  // ── Gradient & overlay defaults ────────────────────────────────────
  const currentGradient = row.layout?.gradient;
  const rowDefaults = ROW_DEFAULTS[row.type] || { start: "#4D1B5E", end: "#5A2370" };
  const legacyStart = row.layout?.gradientStart || rowDefaults.start;
  const legacyEnd = row.layout?.gradientEnd || rowDefaults.end;
  const currentOverlays = row.layout?.overlays || [];

  // ── Background opacity / image ─────────────────────────────────────
  const bgColorOpacity = row.layout?.bgColorOpacity ?? 100;
  const bgImageOpacity = row.layout?.bgImageOpacity ?? 100;
  const bgImage = row.layout?.bgImage || "";

  return (
    <div className="flex flex-col gap-4">
      {/* ── Background Colour + opacity ── */}
      <div>
        <label className="font-body text-[10px] uppercase tracking-wider mb-1 block text-muted-foreground">
          Background Color
        </label>
        <div className="flex gap-1.5">
          {/* Native colour picker. We let the browser draw the swatch. */}
          <input
            type="color"
            value={row.bg_color || "#FFFFFF"}
            onChange={(e) => onRowMetaChange({ bg_color: e.target.value })}
            className="w-10 h-9 rounded border border-border cursor-pointer"
          />
          {/* Hex input mirroring the colour picker. We force a white surface
              + dark text so the hex string remains legible regardless of the
              admin's OS theme — these are the deliberate exceptions to the
              "no inline colour" rule. */}
          <input
            value={row.bg_color || ""}
            onChange={(e) => onRowMetaChange({ bg_color: e.target.value })}
            placeholder="#FFFFFF"
            className="flex-1 px-3 py-2 rounded-lg font-body text-sm border border-border bg-white text-[#1a1a1a]"
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
            onChange={(e) =>
              onRowMetaChange({
                layout: { ...(row.layout || DEFAULT_ROW_LAYOUT), bgColorOpacity: Number(e.target.value) },
              })
            }
            className="flex-1"
            style={{ accentColor: "hsl(var(--secondary))" }}
          />
          <span className="font-body text-[10px] text-foreground min-w-[32px] text-right">
            {bgColorOpacity}%
          </span>
        </div>
      </div>

      {/* ── Background Image + opacity ── */}
      <div>
        <label className="font-body text-[10px] uppercase tracking-wider mb-1 block text-muted-foreground">
          Background Image URL
        </label>
        <input
          value={bgImage}
          onChange={(e) =>
            onRowMetaChange({
              layout: { ...(row.layout || DEFAULT_ROW_LAYOUT), bgImage: e.target.value },
            })
          }
          placeholder="https://..."
          className="w-full px-3 py-2 rounded-lg font-body text-sm border border-border bg-white text-[#1a1a1a]"
        />
        {bgImage && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="font-body text-[9px] uppercase tracking-wider text-muted-foreground min-w-[50px]">
              Opacity
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={bgImageOpacity}
              onChange={(e) =>
                onRowMetaChange({
                  layout: { ...(row.layout || DEFAULT_ROW_LAYOUT), bgImageOpacity: Number(e.target.value) },
                })
              }
              className="flex-1"
              style={{ accentColor: "hsl(var(--secondary))" }}
            />
            <span className="font-body text-[10px] text-foreground min-w-[32px] text-right">
              {bgImageOpacity}%
            </span>
          </div>
        )}
      </div>

      {/* Hero rows manage their own internal alignment elsewhere. */}
      {row.type !== "hero" && (
        <RowAlignmentSettings
          layout={row.layout || DEFAULT_ROW_LAYOUT}
          onChange={(layout) => onRowMetaChange({ layout })}
        />
      )}

      <ColumnWidthControl
        columnCount={widthColCount}
        widths={columnWidths}
        onChange={onUpdateColumnWidths}
        disabled={!showWidthControl}
      />

      <GradientEditor
        gradient={currentGradient}
        legacyStart={legacyStart}
        legacyEnd={legacyEnd}
        onChange={(gradient) =>
          onRowMetaChange({ layout: { ...(row.layout || DEFAULT_ROW_LAYOUT), gradient } })
        }
      />

      <OverlayEditor
        overlays={currentOverlays}
        onChange={(overlays) =>
          onRowMetaChange({ layout: { ...(row.layout || DEFAULT_ROW_LAYOUT), overlays } })
        }
      />
    </div>
  );
};

export default RowStyleTab;
