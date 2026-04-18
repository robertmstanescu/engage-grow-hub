import { Palette, RotateCcw } from "lucide-react";

const QUICK_COLORS = [
  { label: "Gold", value: "#E5C54F" },
  { label: "Violet", value: "#4D1B5E" },
  { label: "Cream", value: "#F9F0C1" },
  { label: "White", value: "#F4F0EC" },
  { label: "Dark", value: "#1B1F24" },
];

interface Props {
  subtitle: string;
  subtitleColor: string;
  onSubtitleChange: (v: string) => void;
  onColorChange: (v: string) => void;
}

const SubtitleEditor = ({ subtitle, subtitleColor, onSubtitleChange, onColorChange }: Props) => (
  <div>
    <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
      Subtitle <span className="text-muted-foreground/60">(Architects Daughter font)</span>
    </label>
    <div className="flex gap-2">
      <input
        value={subtitle}
        onChange={(e) => onSubtitleChange(e.target.value)}
        placeholder="Optional subtitle…"
        className="flex-1 px-3 py-2 rounded-lg text-sm border"
        style={{
          borderColor: "hsl(var(--border))",
          backgroundColor: "hsl(var(--background))",
          fontFamily: "'Architects Daughter', cursive",
          color: subtitleColor || "inherit",
        }}
      />
    </div>
    {subtitle && (
      <div className="flex items-center gap-1 mt-1.5">
        <span className="font-body text-[9px] uppercase tracking-wider text-muted-foreground mr-1">Color:</span>
        {QUICK_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onColorChange(c.value)}
            title={c.label}
            className="w-4 h-4 rounded-full border border-black/10 hover:scale-110 transition-transform"
            style={{
              backgroundColor: c.value,
              outline: subtitleColor === c.value ? "2px solid hsl(var(--primary))" : "none",
              outlineOffset: "1px",
            }}
          />
        ))}
        <button
          type="button"
          onClick={() => {
            const color = window.prompt("Enter color (hex):", subtitleColor || "#E5C54F");
            if (color) onColorChange(color);
          }}
          title="Custom color"
          className="p-1 rounded hover:opacity-70"
          style={{ color: "hsl(var(--muted-foreground))" }}>
          <Palette size={12} />
        </button>
        <button
          type="button"
          onClick={() => onColorChange("")}
          title="Reset color"
          className="p-1 rounded hover:opacity-70"
          style={{ color: "hsl(var(--muted-foreground))" }}>
          <RotateCcw size={11} />
        </button>
      </div>
    )}
  </div>
);

export default SubtitleEditor;
