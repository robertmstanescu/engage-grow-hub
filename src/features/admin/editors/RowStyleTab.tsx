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
import ColumnWidthControl from "../site-editor/ColumnWidthControl";
import GradientEditor from "../site-editor/GradientEditor";
import OverlayEditor from "../site-editor/OverlayEditor";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

// Mirrors the trigger style used in RowContentEditor for visual parity
// across the Properties panel. Update both files together if redesigning.
const TRIGGER_CLASS =
  "py-2.5 px-3 rounded-md bg-muted/30 hover:bg-muted/50 hover:no-underline " +
  "font-body text-[10px] uppercase tracking-[0.12em] text-foreground";

const CONTENT_CLASS = "pt-3 pb-1";

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
    <Accordion type="multiple" defaultValue={["design"]} className="space-y-2">
      <AccordionItem value="design" className="border-none">
        <AccordionTrigger className={TRIGGER_CLASS}>
          Design &amp; Background
        </AccordionTrigger>
        <AccordionContent className={CONTENT_CLASS}>
          <div className="flex flex-col gap-4">
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
              onChange={(gradient) => {
                // Sync legacy gradientStart/End from the new gradient stops so
                // that even when the "Custom Gradient" toggle is off, the
                // decorative legacy glow blobs use the admin's chosen colours.
                const stops = gradient?.stops ?? [];
                const sorted = [...stops].sort((a, b) => a.position - b.position);
                const firstColor = sorted[0]?.color;
                const lastColor = sorted[sorted.length - 1]?.color;
                onRowMetaChange({
                  layout: {
                    ...(row.layout || DEFAULT_ROW_LAYOUT),
                    gradient,
                    ...(firstColor ? { gradientStart: firstColor } : {}),
                    ...(lastColor ? { gradientEnd: lastColor } : {}),
                  },
                });
              }}
            />

            <OverlayEditor
              overlays={currentOverlays}
              onChange={(overlays) =>
                onRowMetaChange({ layout: { ...(row.layout || DEFAULT_ROW_LAYOUT), overlays } })
              }
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default RowStyleTab;
