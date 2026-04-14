import { useEffect, useState } from "react";

interface Props {
  columnCount: number;
  widths: number[];
  onChange: (widths: number[]) => void;
  disabled?: boolean;
}

const PRESETS: Record<number, { label: string; widths: number[] }[]> = {
  2: [
    { label: "50 / 50", widths: [50, 50] },
    { label: "33 / 67", widths: [33, 67] },
    { label: "67 / 33", widths: [67, 33] },
    { label: "25 / 75", widths: [25, 75] },
    { label: "75 / 25", widths: [75, 25] },
    { label: "40 / 60", widths: [40, 60] },
    { label: "60 / 40", widths: [60, 40] },
  ],
  3: [
    { label: "33 / 33 / 34", widths: [33, 33, 34] },
    { label: "50 / 25 / 25", widths: [50, 25, 25] },
    { label: "25 / 50 / 25", widths: [25, 50, 25] },
    { label: "25 / 25 / 50", widths: [25, 25, 50] },
  ],
  4: [
    { label: "25 each", widths: [25, 25, 25, 25] },
    { label: "40 / 20 / 20 / 20", widths: [40, 20, 20, 20] },
  ],
};

const ColumnWidthControl = ({ columnCount, widths, onChange, disabled = false }: Props) => {
  const presets = PRESETS[columnCount] || [];
  const [customMode, setCustomMode] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const handleSlider = (index: number, newVal: number) => {
    const next = [...widths];
    const diff = newVal - next[index];
    // Distribute the difference to the next column (or previous if last)
    const neighbor = index < next.length - 1 ? index + 1 : index - 1;
    if (neighbor < 0) return;
    next[index] = newVal;
    next[neighbor] = Math.max(10, next[neighbor] - diff);
    // Normalize to ensure sum = 100
    const sum = next.reduce((a, b) => a + b, 0);
    if (sum !== 100) {
      next[next.length - 1] += 100 - sum;
    }
    onChange(next.map((w) => Math.max(10, Math.round(w))));
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        className="flex items-center gap-1.5 font-body text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full transition-opacity disabled:cursor-not-allowed"
        style={{
          color: disabled ? "hsl(var(--muted-foreground))" : "hsl(var(--primary))",
          border: `1px solid ${disabled ? "hsl(var(--border))" : "hsl(var(--primary) / 0.3)"}`,
          opacity: disabled ? 0.65 : 1,
        }}
        title={disabled ? "Add another column to edit widths" : "Adjust column widths"}
      >
        Column Widths
      </button>

      {open && !disabled && (
        <div className="mt-3 p-3 rounded-lg space-y-3" style={{ backgroundColor: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.3)" }}>
          <div className="flex items-center justify-between">
            <label className="font-body text-[10px] uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
              Layout Ratios
            </label>
        <button
          type="button"
          onClick={() => setCustomMode(!customMode)}
          className="font-body text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full hover:opacity-70 transition-opacity"
          style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}
        >
          {customMode ? "Presets" : "Custom"}
        </button>
      </div>

          {!customMode ? (
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => {
                const isActive = p.widths.every((w, i) => widths[i] === w);
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => onChange(p.widths)}
                    className="px-2.5 py-1.5 rounded text-[10px] font-body font-medium transition-all"
                    style={{
                      backgroundColor: isActive ? "hsl(var(--primary))" : "hsl(var(--background))",
                      color: isActive ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                      border: `1px solid ${isActive ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {widths.map((w, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="font-body text-[10px] w-16" style={{ color: "hsl(var(--foreground))" }}>
                    Col {i + 1}: {w}%
                  </span>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    step={1}
                    value={w}
                    onChange={(e) => handleSlider(i, Number(e.target.value))}
                    className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: "hsl(var(--primary))" }}
                  />
                </div>
              ))}
              <div className="flex h-4 rounded overflow-hidden" style={{ border: "1px solid hsl(var(--border))" }}>
                {widths.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center font-body text-[8px]"
                    style={{
                      width: `${w}%`,
                      backgroundColor: `hsl(var(--primary) / ${0.15 + i * 0.15})`,
                      color: "hsl(var(--foreground))",
                      borderRight: i < widths.length - 1 ? "1px solid hsl(var(--border))" : undefined,
                    }}
                  >
                    {w}%
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ColumnWidthControl;
