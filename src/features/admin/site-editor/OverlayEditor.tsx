import { useState, useRef } from "react";
import { Image, Plus, Trash2, RotateCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { OverlayElement, OverlayFit, OverlayAnchor, BlendMode } from "@/types/rows";

interface Props {
  overlays: OverlayElement[];
  onChange: (overlays: OverlayElement[]) => void;
}

const FIT_OPTIONS: { label: string; value: OverlayFit }[] = [
  { label: "Fit", value: "fit" },
  { label: "Fill", value: "fill" },
  { label: "Original", value: "original" },
];

const BLEND_OPTIONS: BlendMode[] = [
  "normal", "multiply", "screen", "overlay", "soft-light",
  "hard-light", "color-dodge", "color-burn", "difference", "exclusion", "luminosity",
];

const ANCHOR_GRID: { anchor: OverlayAnchor; row: number; col: number }[] = [
  { anchor: "top-left", row: 0, col: 0 },
  { anchor: "top-center", row: 0, col: 1 },
  { anchor: "top-right", row: 0, col: 2 },
  { anchor: "middle-left", row: 1, col: 0 },
  { anchor: "middle-center", row: 1, col: 1 },
  { anchor: "middle-right", row: 1, col: 2 },
  { anchor: "bottom-left", row: 2, col: 0 },
  { anchor: "bottom-center", row: 2, col: 1 },
  { anchor: "bottom-right", row: 2, col: 2 },
];

const anchorToCSS = (anchor: OverlayAnchor): React.CSSProperties => {
  const [v, h] = anchor.split("-") as [string, string];
  return {
    top: v === "top" ? 0 : v === "middle" ? "50%" : undefined,
    bottom: v === "bottom" ? 0 : undefined,
    left: h === "left" ? 0 : h === "center" ? "50%" : undefined,
    right: h === "right" ? 0 : undefined,
    transform: `translate(${h === "center" ? "-50%" : "0"}, ${v === "middle" ? "-50%" : "0"})`,
  };
};

export const renderOverlayElements = (overlays: OverlayElement[] | undefined) => {
  if (!overlays?.length) return null;
  return overlays.map((el) => {
    const posStyle = anchorToCSS(el.anchor);
    const fitStyle: React.CSSProperties =
      el.fit === "fill" ? { width: "100%", height: "100%", objectFit: "cover" }
      : el.fit === "fit" ? { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }
      : {};
    return (
      <img
        key={el.id}
        src={el.url}
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          ...posStyle,
          ...fitStyle,
          opacity: el.opacity / 100,
          transform: `${posStyle.transform || ""} rotate(${el.rotation}deg)`,
          mixBlendMode: el.blendMode as any,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
    );
  });
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

const OverlayEditor = ({ overlays, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const updateItem = (idx: number, patch: Partial<OverlayElement>) => {
    const next = overlays.map((o, i) => (i === idx ? { ...o, ...patch } : o));
    onChange(next);
  };

  const removeItem = (idx: number) => {
    onChange(overlays.filter((_, i) => i !== idx));
    if (expandedIdx === idx) setExpandedIdx(null);
  };

  const handleUpload = async (file: File) => {
    if (overlays.length >= 5) {
      toast.error("Maximum 5 overlay elements per row");
      return;
    }
    const ext = file.name.split(".").pop() || "png";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("row-overlays").upload(path, file);
    if (error) { toast.error("Upload failed"); return; }
    const { data: { publicUrl } } = supabase.storage.from("row-overlays").getPublicUrl(path);
    const newEl: OverlayElement = {
      id: crypto.randomUUID(),
      url: publicUrl,
      fit: "original",
      anchor: "middle-center",
      opacity: 40,
      rotation: 0,
      blendMode: "normal",
    };
    onChange([...overlays, newEl]);
    setExpandedIdx(overlays.length);
    toast.success("Overlay uploaded");
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          fontFamily: "var(--font-body)", fontSize: 10, textTransform: "uppercase",
          letterSpacing: "0.08em", padding: "5px 12px", borderRadius: 99,
          cursor: "pointer", border: "1px solid hsl(var(--secondary) / 0.3)",
          background: "transparent", color: "hsl(var(--secondary))",
        }}
      >
        <Image size={11} /> Visual Elements ({overlays.length}/5)
      </button>

      {open && (
        <div style={{
          marginTop: 12, padding: 12, borderRadius: 8,
          background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.3)",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = "";
          }} />

          {/* List of overlays */}
          {overlays.map((el, i) => (
            <div key={el.id} style={{
              padding: 8, borderRadius: 6,
              background: "hsl(var(--background))", border: "1px solid hsl(var(--border) / 0.3)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <img src={el.url} alt="" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4 }} />
                <span style={{ flex: 1, fontFamily: "var(--font-body)", fontSize: 10, color: "hsl(var(--foreground))" }}>
                  Element {i + 1}
                </span>
                <button type="button" onClick={() => setExpandedIdx(expandedIdx === i ? null : i)} style={{
                  fontSize: 9, fontFamily: "var(--font-body)", padding: "2px 8px", borderRadius: 4,
                  cursor: "pointer", border: "1px solid hsl(var(--border))", background: "transparent",
                  color: "hsl(var(--foreground))",
                }}>
                  {expandedIdx === i ? "▲" : "▼"}
                </button>
                <button type="button" onClick={() => removeItem(i)} style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 22, height: 22, borderRadius: 4, cursor: "pointer",
                  border: "none", background: "transparent", color: "hsl(var(--destructive))",
                }}>
                  <Trash2 size={11} />
                </button>
              </div>

              {expandedIdx === i && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Fit mode */}
                  <div>
                    <label style={labelStyle}>Fit Mode</label>
                    <div style={{ display: "flex", gap: 4 }}>
                      {FIT_OPTIONS.map((f) => (
                        <button key={f.value} type="button" onClick={() => updateItem(i, { fit: f.value })} style={pillBtn(el.fit === f.value)}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 9-point anchor */}
                  <div>
                    <label style={labelStyle}>Position</label>
                    <div style={{
                      display: "grid", gridTemplateColumns: "repeat(3, 24px)", gridTemplateRows: "repeat(3, 24px)",
                      gap: 3, width: "fit-content",
                    }}>
                      {ANCHOR_GRID.map((g) => (
                        <button
                          key={g.anchor}
                          type="button"
                          onClick={() => updateItem(i, { anchor: g.anchor })}
                          style={{
                            width: 24, height: 24, borderRadius: 4, cursor: "pointer",
                            border: `1.5px solid ${el.anchor === g.anchor ? "hsl(var(--secondary))" : "hsl(var(--border))"}`,
                            background: el.anchor === g.anchor ? "hsl(var(--secondary))" : "hsl(var(--background))",
                          }}
                          title={g.anchor}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Opacity */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>Opacity</label>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "hsl(var(--foreground))" }}>{el.opacity}%</span>
                    </div>
                    <input type="range" min={0} max={100} value={el.opacity}
                      onChange={(e) => updateItem(i, { opacity: Number(e.target.value) })}
                      style={{ width: "100%", accentColor: "hsl(var(--secondary))" }} />
                  </div>

                  {/* Rotation */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>
                        <RotateCw size={9} style={{ display: "inline", marginRight: 4 }} />Rotation
                      </label>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "hsl(var(--foreground))" }}>{el.rotation}°</span>
                    </div>
                    <input type="range" min={0} max={360} value={el.rotation}
                      onChange={(e) => updateItem(i, { rotation: Number(e.target.value) })}
                      style={{ width: "100%", accentColor: "hsl(var(--secondary))" }} />
                  </div>

                  {/* Blend mode */}
                  <div>
                    <label style={labelStyle}>Blend Mode</label>
                    <select
                      value={el.blendMode}
                      onChange={(e) => updateItem(i, { blendMode: e.target.value as BlendMode })}
                      style={{
                        width: "100%", padding: "4px 8px", borderRadius: 6, fontSize: 10,
                        fontFamily: "var(--font-body)", border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--background))", color: "hsl(var(--foreground))",
                      }}
                    >
                      {BLEND_OPTIONS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}

          {overlays.length < 5 && (
            <button type="button" onClick={() => fileRef.current?.click()} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "8px 12px", borderRadius: 6, cursor: "pointer",
              border: "1px dashed hsl(var(--border))", background: "transparent",
              fontFamily: "var(--font-body)", fontSize: 10, color: "hsl(var(--muted-foreground))",
            }}>
              <Plus size={12} /> Upload overlay image
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default OverlayEditor;
