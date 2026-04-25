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

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Smartphone, Monitor, BookmarkPlus, Loader2 } from "lucide-react";
import { DEFAULT_DESIGN_SETTINGS, type WidgetDesignSettings } from "@/types/rows";
import { useGlobalWidgets } from "@/hooks/useGlobalWidgets";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  design: WidgetDesignSettings;
  onChange: (next: WidgetDesignSettings) => void;
  widgetLabel: string;
  /**
   * Save-as-Global support (US 8.1). When provided, surfaces a button
   * that snapshots the cell's current widget data into the
   * `global_widgets` table, then converts the cell into a reference
   * via `onConvertedToGlobal(globalId)`.
   *
   * Optional so legacy call sites keep working without modification.
   */
  saveAsGlobal?: {
    /** The widget type (e.g. "contact", "hero") at this cell. */
    widgetType: string;
    /** The widget data blob to snapshot (excluding `__design`/`__global_ref`). */
    snapshotData: Record<string, any>;
    /** Suggested name (e.g. row strip title). */
    suggestedName: string;
    /** Called with the new global widget id once it's saved. */
    onConvertedToGlobal: (globalId: string) => void;
    /** When true, the cell is already a reference — disable the action. */
    isAlreadyReference?: boolean;
  };
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
  open, onOpenChange, design, onChange, widgetLabel, saveAsGlobal,
}: Props) => {
  // WHY a single `update` helper: every control patches one field; the
  // parent receives the full, merged `WidgetDesignSettings` so it can
  // write it back atomically without each call site re-merging defaults.
  const update = <K extends keyof WidgetDesignSettings>(key: K, value: WidgetDesignSettings[K]) =>
    onChange({ ...design, [key]: value });

  const reset = () => onChange({ ...DEFAULT_DESIGN_SETTINGS });

  // Save-as-Global state (US 8.1). The button is gated behind a small
  // inline name prompt instead of a full modal — admins are already in
  // the drawer's focused context, and a name input is the only piece
  // of metadata required to create a Global Block.
  const [savingName, setSavingName] = useState<string | null>(null);
  const { create, isMutating } = useGlobalWidgets();

  const handleConfirmSave = async () => {
    if (!saveAsGlobal || !savingName?.trim()) return;
    try {
      const created = await create({
        name: savingName.trim(),
        type: saveAsGlobal.widgetType,
        // WHY strip `__design` / `__global_ref`: the global record holds
        // the WIDGET'S OWN data only. Per-instance chrome lives on the
        // referencing cell so two pages can reuse the same global block
        // with different margins.
        data: stripReservedKeys(saveAsGlobal.snapshotData),
      });
      saveAsGlobal.onConvertedToGlobal(created.id);
      setSavingName(null);
    } catch {
      // toast already surfaced by the hook
    }
  };

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
          {/* ── Visibility (US 6.2) ────────────────────────────── */}
          {/*
           * Per-breakpoint show/hide. We surface this at the TOP of
           * the drawer because it's the highest-impact toggle: a
           * "hidden on mobile" widget skips painting entirely below
           * 768px, which dwarfs any margin/padding tweak in effect.
           *
           * WHY two switches instead of a single radio with three
           * states (mobile/desktop/both): admins routinely want
           * "hidden everywhere" while they tweak content without
           * deleting the widget, and the two-toggle UI lets them
           * express that without a fourth radio option.
           */}
          <section>
            <h3 className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Visibility
            </h3>
            <div className="space-y-2">
              <label className="flex items-center justify-between gap-3 px-3 py-2 rounded-md" style={{ backgroundColor: "hsl(var(--muted) / 0.3)" }}>
                <span className="flex items-center gap-2 font-body text-xs" style={{ color: "hsl(var(--foreground))" }}>
                  <Smartphone size={14} />
                  Show on mobile
                  <span className="font-body text-[9px] text-muted-foreground">(&lt; 768px)</span>
                </span>
                <Switch
                  checked={design.visibility.mobile}
                  onCheckedChange={(checked) =>
                    update("visibility", { ...design.visibility, mobile: checked })
                  }
                />
              </label>
              <label className="flex items-center justify-between gap-3 px-3 py-2 rounded-md" style={{ backgroundColor: "hsl(var(--muted) / 0.3)" }}>
                <span className="flex items-center gap-2 font-body text-xs" style={{ color: "hsl(var(--foreground))" }}>
                  <Monitor size={14} />
                  Show on desktop
                  <span className="font-body text-[9px] text-muted-foreground">(≥ 768px)</span>
                </span>
                <Switch
                  checked={design.visibility.desktop}
                  onCheckedChange={(checked) =>
                    update("visibility", { ...design.visibility, desktop: checked })
                  }
                />
              </label>
              {/*
               * Friendly belt-and-braces hint when the admin has hidden
               * the widget at every breakpoint. We DON'T auto-correct —
               * juniors might want this for a temporarily disabled CTA —
               * but we surface the consequence so it isn't a silent foot-gun.
               */}
              {!design.visibility.mobile && !design.visibility.desktop && (
                <p className="font-body text-[10px] mt-1" style={{ color: "hsl(var(--destructive))" }}>
                  This widget is hidden on every screen size.
                </p>
              )}
            </div>
          </section>

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
