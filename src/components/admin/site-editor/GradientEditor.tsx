import { useState } from "react";
import { Paintbrush, Plus, Trash2 } from "lucide-react";
import type { GradientConfig, GradientStop, GradientType, RowLayout } from "@/types/rows";
import { DEFAULT_GRADIENT } from "@/types/rows";

interface Props {
  gradient: GradientConfig | undefined;
  /** Pass the row's legacy gradientStart/gradientEnd so we can auto-populate */
  legacyStart?: string;
  legacyEnd?: string;
  onChange: (g: GradientConfig) => void;
}

const GRADIENT_TYPES: { label: string; value: GradientType }[] = [
  { label: "Linear", value: "linear" },
  { label: "Radial", value: "radial" },
  { label: "Conic", value: "conic" },
  { label: "Mesh", value: "mesh" },
];

const DIRECTION_PRESETS = [
  { label: "↑", angle: 0 },
  { label: "↗", angle: 45 },
  { label: "→", angle: 90 },
  { label: "↘", angle: 135 },
  { label: "↓", angle: 180 },
  { label: "↙", angle: 225 },
  { label: "←", angle: 270 },
  { label: "↖", angle: 315 },
];

const RADIAL_POSITIONS = [
  "center", "top", "top right", "right", "bottom right",
  "bottom", "bottom left", "left", "top left",
];

/** Convert a hex color (#RRGGBB or #RGB) + 0-100 alpha → rgba() string. Pass-through for non-hex. */
const applyAlpha = (color: string, alpha = 100): string => {
  if (alpha >= 100) return color;
  const a = Math.max(0, Math.min(100, alpha)) / 100;
  let hex = color.trim();
  if (hex.startsWith("#")) {
    hex = hex.slice(1);
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  }
  // Fallback: leave color, browsers won't apply alpha — acceptable for non-hex
  return color;
};

/** Build a CSS gradient string for preview */
export const buildGradientCSS = (g: GradientConfig): string => {
  if (!g.enabled || g.stops.length < 2) return "";
  const sortedStops = [...g.stops].sort((a, b) => a.position - b.position);
  const stopStr = sortedStops.map((s) => `${applyAlpha(s.color, s.alpha)} ${s.position}%`).join(", ");

  switch (g.type) {
    case "linear":
      return `linear-gradient(${g.angle}deg, ${stopStr})`;
    case "radial": {
      const shape = g.radialShape || "ellipse";
      const pos = g.radialPosition || "center";
      return `radial-gradient(${shape} at ${pos}, ${stopStr})`;
    }
    case "conic": {
      const pos = g.radialPosition || "center";
      return `conic-gradient(from ${g.angle}deg at ${pos}, ${stopStr})`;
    }
    case "mesh": {
      // Mesh approximation: layered radial gradients
      if (sortedStops.length < 2) return "";
      return sortedStops
        .map((s, i) => {
          const positions = ["20% 20%", "80% 20%", "50% 80%", "20% 80%", "80% 80%", "50% 20%"];
          const pos = positions[i % positions.length];
          return `radial-gradient(ellipse at ${pos}, ${applyAlpha(s.color, s.alpha)} 0%, transparent 70%)`;
        })
        .join(", ");
    }
    default:
      return "";
  }
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)", fontSize: 10, textTransform: "uppercase",
  letterSpacing: "0.1em", color: "hsl(var(--muted-foreground))", display: "block", marginBottom: 4,
};

const pillBtn = (active: boolean): React.CSSProperties => ({
  padding: "4px 8px", borderRadius: 6, fontSize: 10, fontFamily: "var(--font-body)",
  fontWeight: 500, cursor: "pointer", border: "1px solid",
  borderColor: active ? "hsl(var(--secondary))" : "hsl(var(--border))",
  background: active ? "hsl(var(--secondary) / 0.15)" : "transparent",
  color: active ? "hsl(var(--secondary))" : "hsl(var(--foreground))",
});

const GradientEditor = ({ gradient, legacyStart, legacyEnd, onChange }: Props) => {
  const [open, setOpen] = useState(false);

  // Auto-populate from legacy gradientStart/gradientEnd if no new config exists
  const resolvedGradient: GradientConfig = gradient
    ? { ...DEFAULT_GRADIENT, ...gradient }
    : {
        ...DEFAULT_GRADIENT,
        enabled: !!(legacyStart || legacyEnd),
        stops: [
          { color: legacyStart || DEFAULT_GRADIENT.stops[0].color, position: 0 },
          { color: legacyEnd || DEFAULT_GRADIENT.stops[1].color, position: 100 },
        ],
      };
  const g = resolvedGradient;

  const update = (patch: Partial<GradientConfig>) => onChange({ ...g, ...patch });

  const updateStop = (idx: number, patch: Partial<GradientStop>) => {
    const stops = g.stops.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    update({ stops });
  };

  const addStop = () => {
    const sorted = [...g.stops].sort((a, b) => a.position - b.position);
    const last = sorted[sorted.length - 1];
    const secondLast = sorted.length >= 2 ? sorted[sorted.length - 2] : sorted[0];
    const newPos = Math.min(100, Math.round((last.position + secondLast.position) / 2 + 10));
    update({ stops: [...g.stops, { color: last.color, position: Math.min(newPos, 100) }] });
  };

  const removeStop = (idx: number) => {
    if (g.stops.length <= 2) return;
    update({ stops: g.stops.filter((_, i) => i !== idx) });
  };

  const previewCSS = g.enabled ? buildGradientCSS(g) : buildGradientCSS({ ...g, enabled: true });

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          fontFamily: "var(--font-body)", fontSize: 10, textTransform: "uppercase",
          letterSpacing: "0.08em", padding: "5px 12px", borderRadius: 99,
          cursor: "pointer", transition: "opacity 0.2s",
          border: "1px solid hsl(var(--secondary) / 0.3)", background: "transparent",
          color: "hsl(var(--secondary))",
        }}
      >
        <Paintbrush size={11} /> Background Gradient
      </button>

      {open && (
        <div style={{
          marginTop: 12, padding: 12, borderRadius: 8,
          background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.3)",
          display: "flex", flexDirection: "column", gap: 14,
        }}>
          {/* Enable toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox" checked={g.enabled}
              onChange={(e) => update({ enabled: e.target.checked })}
              style={{ accentColor: "hsl(var(--secondary))" }}
            />
            <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "hsl(var(--foreground))" }}>
              Enable gradient background
            </span>
          </label>

          {/* Preview bar */}
          <div style={{
            height: 32, borderRadius: 6,
            background: previewCSS || "hsl(var(--muted))",
            border: "1px solid hsl(var(--border) / 0.3)",
            opacity: g.enabled ? 1 : 0.4,
          }} />

          {/* Gradient type */}
          <div>
            <label style={labelStyle}>Type</label>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {GRADIENT_TYPES.map((t) => (
                <button key={t.value} type="button" onClick={() => update({ type: t.value })} style={pillBtn(g.type === t.value)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Direction / angle — for linear and conic */}
          {(g.type === "linear" || g.type === "conic") && (
            <div>
              <label style={labelStyle}>Direction</label>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                {DIRECTION_PRESETS.map((d) => (
                  <button key={d.angle} type="button" onClick={() => update({ angle: d.angle })} style={{
                    ...pillBtn(g.angle === d.angle), width: 30, height: 30,
                    display: "flex", alignItems: "center", justifyContent: "center", padding: 0, fontSize: 13,
                  }}>
                    {d.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="range" min={0} max={360} value={g.angle}
                  onChange={(e) => update({ angle: Number(e.target.value) })}
                  style={{ flex: 1, accentColor: "hsl(var(--secondary))" }}
                />
                <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "hsl(var(--foreground))", minWidth: 32, textAlign: "right" }}>
                  {g.angle}°
                </span>
              </div>
            </div>
          )}

          {/* Radial shape & position — for radial and conic */}
          {(g.type === "radial" || g.type === "conic") && (
            <div>
              {g.type === "radial" && (
                <div style={{ marginBottom: 10 }}>
                  <label style={labelStyle}>Shape</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    {(["ellipse", "circle"] as const).map((s) => (
                      <button key={s} type="button" onClick={() => update({ radialShape: s })} style={pillBtn(g.radialShape === s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <label style={labelStyle}>Position</label>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {RADIAL_POSITIONS.map((p) => (
                  <button key={p} type="button" onClick={() => update({ radialPosition: p })} style={pillBtn(g.radialPosition === p)}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Colour stops */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Colour Stops</label>
              <button type="button" onClick={addStop} style={{
                display: "flex", alignItems: "center", gap: 3,
                fontSize: 9, fontFamily: "var(--font-body)", textTransform: "uppercase",
                letterSpacing: "0.08em", padding: "3px 8px", borderRadius: 12,
                cursor: "pointer", border: "1px solid hsl(var(--secondary) / 0.3)",
                background: "transparent", color: "hsl(var(--secondary))",
              }}>
                <Plus size={9} /> Add
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {g.stops.map((stop, i) => {
                const a = stop.alpha ?? 100;
                return (
                  <div key={i} style={{
                    display: "flex", flexDirection: "column", gap: 4,
                    padding: 6, borderRadius: 6,
                    background: "hsl(var(--background))", border: "1px solid hsl(var(--border) / 0.3)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="color" value={stop.color}
                        onChange={(e) => updateStop(i, { color: e.target.value })}
                        style={{ width: 28, height: 28, borderRadius: 4, border: "none", cursor: "pointer", flexShrink: 0 }}
                      />
                      <input
                        value={stop.color}
                        onChange={(e) => updateStop(i, { color: e.target.value })}
                        style={{
                          flex: 1, padding: "4px 8px", borderRadius: 6, fontSize: 10, fontFamily: "var(--font-body)",
                          border: "1px solid hsl(var(--border))", background: "hsl(var(--background))", color: "hsl(var(--foreground))",
                        }}
                      />
                      <input
                        type="range" min={0} max={100} value={stop.position}
                        onChange={(e) => updateStop(i, { position: Number(e.target.value) })}
                        style={{ width: 60, accentColor: "hsl(var(--secondary))" }}
                      />
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "hsl(var(--muted-foreground))", minWidth: 24 }}>
                        {stop.position}%
                      </span>
                      <button
                        type="button" onClick={() => removeStop(i)}
                        disabled={g.stops.length <= 2}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: 22, height: 22, borderRadius: 4, cursor: g.stops.length > 2 ? "pointer" : "not-allowed",
                          border: "none", background: "transparent",
                          color: g.stops.length > 2 ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground) / 0.3)",
                        }}
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                    {/* Per-stop alpha */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 34 }}>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.08em", minWidth: 38 }}>
                        Alpha
                      </span>
                      <input
                        type="range" min={0} max={100} value={a}
                        onChange={(e) => updateStop(i, { alpha: Number(e.target.value) })}
                        style={{ flex: 1, accentColor: "hsl(var(--secondary))" }}
                      />
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "hsl(var(--foreground))", minWidth: 28, textAlign: "right" }}>
                        {a}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mesh hint */}
          {g.type === "mesh" && (
            <p style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "hsl(var(--muted-foreground))", fontStyle: "italic", margin: 0 }}>
              Mesh uses layered radial gradients — add 3+ stops for best results.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default GradientEditor;
