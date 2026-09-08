import { Palette, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useBrandColors } from "@/hooks/useBrandSettings";

/**
 * SubtitleEditor — one plain field, themed like every other input.
 *
 * Typing lives in local state and is pushed upstream after a one-second
 * pause (or on blur), so the global re-render never fights the cursor.
 * While this input has focus, incoming prop changes are ignored; when
 * the admin switches rows the prop wins. Colour swatches and the
 * handwritten toggle only appear once there is a subtitle to style.
 */

interface Props {
  subtitle: string;
  subtitleColor: string;
  onSubtitleChange: (v: string) => void;
  onColorChange: (v: string) => void;
  /** Opt-in handwritten (Architects Daughter) styling for the subtitle. */
  handwritten?: boolean;
  onHandwrittenChange?: (v: boolean) => void;
  /** Accepted for API compatibility; the field is themed by the admin, not the row. */
  bgColor?: string;
}

const SubtitleEditor = ({ subtitle, subtitleColor, onSubtitleChange, onColorChange, handwritten, onHandwrittenChange }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const brandColors = useBrandColors();
  const [localValue, setLocalValue] = useState(subtitle || "");
  const lastPushedRef = useRef(subtitle || "");

  useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    if (subtitle !== lastPushedRef.current) {
      setLocalValue(subtitle || "");
      lastPushedRef.current = subtitle || "";
    }
  }, [subtitle]);

  const debouncedPush = useDebouncedCallback((value: string) => {
    lastPushedRef.current = value;
    onSubtitleChange(value);
  }, 1000);

  return (
    <div data-inspector-field="subtitle">
      <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Subtitle</label>
      <input
        ref={inputRef}
        value={localValue}
        onChange={(e) => { setLocalValue(e.target.value); debouncedPush(e.target.value); }}
        onBlur={() => debouncedPush.flush()}
        placeholder="Optional line under the title"
        className="admin-input"
        style={{ ...(handwritten ? { fontFamily: "'Architects Daughter', cursive" } : {}), ...(subtitleColor ? { color: subtitleColor } : {}) }}
      />
      {localValue && (
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {onHandwrittenChange && (
            <label className="flex items-center gap-1.5 cursor-pointer font-body text-[11px] text-muted-foreground">
              <input type="checkbox" checked={!!handwritten} onChange={(e) => onHandwrittenChange(e.target.checked)} />
              Handwritten style
            </label>
          )}
          <span className="flex-1" />
          {brandColors.slice(0, 6).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onColorChange(c.hex)}
              title={c.name}
              aria-label={`Colour ${c.name}`}
              className="w-4 h-4 rounded-full border"
              style={{ backgroundColor: c.hex, borderColor: "hsl(var(--input))", outline: subtitleColor === c.hex ? "2px solid hsl(var(--foreground))" : "none", outlineOffset: "1px" }}
            />
          ))}
          <button type="button" onClick={() => { const color = window.prompt("Colour (hex):", subtitleColor || "#E5C54F"); if (color) onColorChange(color); }} title="Other colour" aria-label="Other colour" className="admin-btn ghost icon"><Palette size={12} /></button>
          {subtitleColor && <button type="button" onClick={() => onColorChange("")} title="Default colour" aria-label="Default colour" className="admin-btn ghost icon"><RotateCcw size={11} /></button>}
        </div>
      )}
    </div>
  );
};

export default SubtitleEditor;
