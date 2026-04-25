/**
 * ════════════════════════════════════════════════════════════════════
 * WidgetSettingsDrawer — the global "Inspector" (US 6.1)
 * ════════════════════════════════════════════════════════════════════
 *
 * WHY THIS EXISTS
 * ───────────────
 * Hardcoding `bg_color`, `padding`, etc. into every widget's admin
 * editor (see the legacy `HeroEditor`) means every new widget reinvents
 * the same controls. By extracting them into a single right-hand drawer
 * driven by `WidgetDesignSettings`, we satisfy OCP for visual chrome:
 * adding a new widget no longer requires building a background picker.
 *
 * The drawer is a controlled component. Parents pass:
 *   - `open` / `onOpenChange` — Sheet visibility
 *   - `design`               — current `__design` from the cell content
 *   - `onChange(next)`       — receives a fully-merged WidgetDesignSettings
 *   - `widgetLabel`          — display string ("hero · Col 1") for context
 *
 * The parent is responsible for writing `next` back to the cell content
 * blob under the reserved `__design` key. We never mutate state here.
 */

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { DEFAULT_DESIGN_SETTINGS, type WidgetDesignSettings } from "@/types/rows";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  design: WidgetDesignSettings;
  onChange: (next: WidgetDesignSettings) => void;
  widgetLabel: string;
}

const FIELD_LABEL = "font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block";
const NUM_INPUT = "w-full px-2 py-1.5 rounded-md font-body text-sm border";

const NumberField = ({
  label, value, onChange, max = 200,
}: { label: string; value: number; onChange: (n: number) => void; max?: number }) => (
  <div>
    <label className={FIELD_LABEL}>{label}</label>
    <input
      type="number"
      min={0}
      max={max}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => {
        // WHY clamp on read: a stray non-numeric paste would otherwise
        // propagate `NaN` into the JSON and break inline-style serialisation.
        const n = Number(e.target.value);
        onChange(Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0);
      }}
      className={NUM_INPUT}
      style={{
        borderColor: "hsl(var(--border))",
        backgroundColor: "#FFFFFF",
        color: "#1a1a1a",
      }}
    />
  </div>
);

const WidgetSettingsDrawer = ({
  open, onOpenChange, design, onChange, widgetLabel,
}: Props) => {
  // WHY a single `update` helper: every control patches one field; the
  // parent receives the full, merged `WidgetDesignSettings` so it can
  // write it back atomically without each call site re-merging defaults.
  const update = <K extends keyof WidgetDesignSettings>(key: K, value: WidgetDesignSettings[K]) =>
    onChange({ ...design, [key]: value });

  const reset = () => onChange({ ...DEFAULT_DESIGN_SETTINGS });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-sm overflow-y-auto"
        style={{ backgroundColor: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
      >
        <SheetHeader>
          <SheetTitle className="font-display text-lg">Widget Settings</SheetTitle>
          <SheetDescription className="font-body text-xs text-muted-foreground">
            {widgetLabel}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* ── Background ─────────────────────────────────────── */}
          <section>
            <h3 className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Background
            </h3>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={design.bgColor || "#ffffff"}
                onChange={(e) => update("bgColor", e.target.value)}
                className="w-10 h-9 rounded border cursor-pointer"
                style={{ borderColor: "hsl(var(--border))" }}
              />
              <input
                value={design.bgColor || ""}
                onChange={(e) => update("bgColor", e.target.value)}
                placeholder="transparent"
                className="flex-1 px-3 py-2 rounded-lg font-body text-sm border"
                style={{
                  borderColor: "hsl(var(--border))",
                  backgroundColor: "#FFFFFF",
                  color: "#1a1a1a",
                }}
              />
              {design.bgColor && (
                <button
                  type="button"
                  onClick={() => update("bgColor", "")}
                  className="font-body text-[10px] uppercase tracking-wider px-2 py-1 rounded hover:opacity-70"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  Clear
                </button>
              )}
            </div>
          </section>

          {/* ── Border radius ──────────────────────────────────── */}
          <section>
            <h3 className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Border Radius
            </h3>
            <NumberField
              label="Radius (px)"
              value={design.borderRadius}
              onChange={(n) => update("borderRadius", n)}
              max={120}
            />
          </section>

          {/* ── Padding ────────────────────────────────────────── */}
          <section>
            <h3 className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Padding (px)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Top"    value={design.paddingTop}    onChange={(n) => update("paddingTop", n)} />
              <NumberField label="Right"  value={design.paddingRight}  onChange={(n) => update("paddingRight", n)} />
              <NumberField label="Bottom" value={design.paddingBottom} onChange={(n) => update("paddingBottom", n)} />
              <NumberField label="Left"   value={design.paddingLeft}   onChange={(n) => update("paddingLeft", n)} />
            </div>
          </section>

          {/* ── Margin ─────────────────────────────────────────── */}
          <section>
            <h3 className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Margin (px)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Top"    value={design.marginTop}    onChange={(n) => update("marginTop", n)} />
              <NumberField label="Right"  value={design.marginRight}  onChange={(n) => update("marginRight", n)} />
              <NumberField label="Bottom" value={design.marginBottom} onChange={(n) => update("marginBottom", n)} />
              <NumberField label="Left"   value={design.marginLeft}   onChange={(n) => update("marginLeft", n)} />
            </div>
          </section>

          <div className="pt-2 border-t" style={{ borderColor: "hsl(var(--border) / 0.4)" }}>
            <button
              type="button"
              onClick={reset}
              className="font-body text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full hover:opacity-70 transition-opacity"
              style={{
                color: "hsl(var(--destructive))",
                border: "1px solid hsl(var(--destructive) / 0.3)",
              }}
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default WidgetSettingsDrawer;
