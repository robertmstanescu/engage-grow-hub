import { AlignLeft, AlignCenter, AlignRight, ArrowUpToLine, AlignVerticalJustifyCenter, ArrowDownToLine } from "lucide-react";
import { useState } from "react";
import type { RowLayout } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/types/rows";

interface Props {
  layout: RowLayout;
  onChange: (layout: RowLayout) => void;
}

const H_OPTIONS = [
  { label: "Left", value: "left", icon: AlignLeft },
  { label: "Center", value: "center", icon: AlignCenter },
  { label: "Right", value: "right", icon: AlignRight },
] as const;

const V_OPTIONS = [
  { label: "Top", value: "top", icon: ArrowUpToLine },
  { label: "Middle", value: "middle", icon: AlignVerticalJustifyCenter },
  { label: "Bottom", value: "bottom", icon: ArrowDownToLine },
] as const;

const RowAlignmentSettings = ({ layout, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const l = { ...DEFAULT_ROW_LAYOUT, ...layout };

  const update = (patch: Partial<RowLayout>) => onChange({ ...l, ...patch });

  const currentH = l.alignment === "auto" ? "left" : (l.alignment || "left");
  const currentV = l.verticalAlign || "middle";

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 font-body text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full hover:opacity-70 transition-opacity"
        style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
        <AlignCenter size={11} /> Row Alignment
      </button>

      {open && (
        <div className="mt-3 p-3 rounded-lg space-y-4" style={{ backgroundColor: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.3)" }}>
          {/* Horizontal Alignment */}
          <div>
            <label className="font-body text-[10px] uppercase tracking-wider block mb-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>
              Horizontal Alignment
            </label>
            <div className="flex gap-1.5">
              {H_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = currentH === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update({ alignment: opt.value as RowLayout["alignment"] })}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-[10px] font-body font-medium transition-all"
                    style={{
                      backgroundColor: active ? "hsl(var(--primary))" : "hsl(var(--background))",
                      color: active ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                      border: `1px solid ${active ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                    }}>
                    <Icon size={12} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vertical Positioning */}
          <div>
            <label className="font-body text-[10px] uppercase tracking-wider block mb-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>
              Vertical Position
            </label>
            <div className="flex gap-1.5">
              {V_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = currentV === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update({ verticalAlign: opt.value as RowLayout["verticalAlign"] })}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-[10px] font-body font-medium transition-all"
                    style={{
                      backgroundColor: active ? "hsl(var(--primary))" : "hsl(var(--background))",
                      color: active ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                      border: `1px solid ${active ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                    }}>
                    <Icon size={12} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RowAlignmentSettings;
