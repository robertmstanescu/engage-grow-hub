import { Settings2 } from "lucide-react";
import { useState } from "react";
import type { RowLayout } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/lib/constants/rowDefaults";

interface Props {
  layout: RowLayout;
  onChange: (layout: RowLayout) => void;
}

const ALIGNMENT_OPTIONS = [
  { label: "Auto (alternate)", value: "auto" },
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" },
];

const RowLayoutSettings = ({ layout, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const l = { ...DEFAULT_ROW_LAYOUT, ...layout };

  const update = (patch: Partial<RowLayout>) => onChange({ ...l, ...patch });

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 font-body text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full hover:opacity-70 transition-opacity"
        style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
        <Settings2 size={11} /> Layout & Spacing
      </button>

      {open && (
        <div className="mt-3 p-3 rounded-lg space-y-4" style={{ backgroundColor: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.3)" }}>
          {/* Alignment */}
          <div>
            <label className="font-body text-[10px] uppercase tracking-wider block mb-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>
              Alignment
            </label>
            <div className="flex gap-1.5">
              {ALIGNMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update({ alignment: opt.value as RowLayout["alignment"] })}
                  className="flex-1 py-1.5 rounded text-[10px] font-body font-medium transition-all"
                  style={{
                    backgroundColor: (l.alignment || "auto") === opt.value ? "hsl(var(--primary))" : "hsl(var(--background))",
                    color: (l.alignment || "auto") === opt.value ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                    border: `1px solid ${(l.alignment || "auto") === opt.value ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Columns */}
          <div>
            <label className="font-body text-[10px] uppercase tracking-wider block mb-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>
              Columns
            </label>
            <div className="flex gap-1.5">
              {([1, 2, 3, 4] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => update({ columns: n })}
                  className="flex-1 py-1.5 rounded text-xs font-body font-medium transition-all"
                  style={{
                    backgroundColor: l.columns === n ? "hsl(var(--primary))" : "hsl(var(--background))",
                    color: l.columns === n ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                    border: `1px solid ${l.columns === n ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                  }}>
                  {n} col
                </button>
              ))}
            </div>
          </div>

          {/* Full Width Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={l.fullWidth}
              onChange={(e) => update({ fullWidth: e.target.checked })}
              className="rounded"
              style={{ accentColor: "hsl(var(--primary))" }}
            />
            <span className="font-body text-xs" style={{ color: "hsl(var(--foreground))" }}>Full Width</span>
          </label>

          {/* Carousel Theme */}
          <div>
            <label className="font-body text-[10px] uppercase tracking-wider block mb-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>
              Carousel Theme
            </label>
            <div className="flex gap-1.5">
              {([{ label: "Auto", value: "auto" }, { label: "Light", value: "light" }, { label: "Dark", value: "dark" }] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update({ carouselTheme: opt.value as RowLayout["carouselTheme"] })}
                  className="flex-1 py-1.5 rounded text-[10px] font-body font-medium transition-all"
                  style={{
                    backgroundColor: (l.carouselTheme || "auto") === opt.value ? "hsl(var(--primary))" : "hsl(var(--background))",
                    color: (l.carouselTheme || "auto") === opt.value ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                    border: `1px solid ${(l.carouselTheme || "auto") === opt.value ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gradient Colours */}
          <div>
            <label className="font-body text-[10px] uppercase tracking-wider block mb-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>
              Background Gradient
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-body text-[9px] uppercase tracking-wider block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Start Colour</label>
                <div className="flex gap-1.5">
                  <input
                    type="color"
                    value={l.gradientStart || "#4D1B5E"}
                    onChange={(e) => update({ gradientStart: e.target.value })}
                    className="w-8 h-8 rounded border-0 cursor-pointer"
                  />
                  <input
                    value={l.gradientStart || ""}
                    onChange={(e) => update({ gradientStart: e.target.value })}
                    placeholder="Auto"
                    className="flex-1 px-2 py-1 rounded font-body text-xs border text-black"
                    style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
                  />
                </div>
              </div>
              <div>
                <label className="font-body text-[9px] uppercase tracking-wider block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>End Colour</label>
                <div className="flex gap-1.5">
                  <input
                    type="color"
                    value={l.gradientEnd || "#5A2370"}
                    onChange={(e) => update({ gradientEnd: e.target.value })}
                    className="w-8 h-8 rounded border-0 cursor-pointer"
                  />
                  <input
                    value={l.gradientEnd || ""}
                    onChange={(e) => update({ gradientEnd: e.target.value })}
                    placeholder="Auto"
                    className="flex-1 px-2 py-1 rounded font-body text-xs border text-black"
                    style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Spacing Sliders */}
          <div className="grid grid-cols-2 gap-3">
            <SliderField label="Padding Top" value={l.paddingTop} onChange={(v) => update({ paddingTop: v })} max={200} />
            <SliderField label="Padding Bottom" value={l.paddingBottom} onChange={(v) => update({ paddingBottom: v })} max={200} />
            <SliderField label="Margin Top" value={l.marginTop} onChange={(v) => update({ marginTop: v })} max={120} />
            <SliderField label="Margin Bottom" value={l.marginBottom} onChange={(v) => update({ marginBottom: v })} max={120} />
          </div>

          {/* Background Image */}
          <div>
            <label className="font-body text-[10px] uppercase tracking-wider block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
              Background Image URL
            </label>
            <input
              value={l.bgImage || ""}
              onChange={(e) => update({ bgImage: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2 rounded-lg font-body text-sm border"
              style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const SliderField = ({ label, value, onChange, max }: { label: string; value: number; onChange: (v: number) => void; max: number }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <label className="font-body text-[10px] uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</label>
      <span className="font-body text-[10px]" style={{ color: "hsl(var(--foreground))" }}>{value}px</span>
    </div>
    <input
      type="range"
      min={0}
      max={max}
      step={4}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
      style={{ accentColor: "hsl(var(--primary))" }}
    />
  </div>
);

export default RowLayoutSettings;
