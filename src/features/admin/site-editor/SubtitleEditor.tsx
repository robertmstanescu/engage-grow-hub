import { Palette, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useBrandColors } from "@/hooks/useBrandSettings";
import { pickForeground } from "@/lib/pickForeground";

/**
 * ─────────────────────────────────────────────────────────────────────────
 * SubtitleEditor — local state + debounced upstream push (1s)
 * ─────────────────────────────────────────────────────────────────────────
 *
 * KEYSTROKE-LAG ARCHITECTURE (junior-dev orientation)
 * ───────────────────────────────────────────────────
 * Typed text lives in `localValue` (a plain `useState`) so what the user
 * sees on screen is updated synchronously and the cursor never moves.
 * We only push the value upstream after the user pauses for ONE FULL
 * SECOND, which gives admins enough breathing room to finish a thought
 * before the global re-render cascade fires.
 *
 * FOCUS PROTECTION
 * ────────────────
 * The reconciliation `useEffect` is guarded: while this input owns the
 * keyboard focus we IGNORE prop changes that would otherwise overwrite
 * what the user is typing. Combined with `lastPushedRef`, this means:
 *   • Our own debounced push echoes back as a prop change → ignored.
 *   • The admin switches rows → input is not focused → prop wins.
 *
 * On blur we flush any pending push so we never lose the user's last
 * edit when they tab away.
 * ─────────────────────────────────────────────────────────────────────────
 */

interface Props {
  subtitle: string;
  subtitleColor: string;
  onSubtitleChange: (v: string) => void;
  onColorChange: (v: string) => void;
  /** Live row background — when supplied, the input mirrors it and
   *  text auto-switches to a readable foreground via `pickForeground`. */
  bgColor?: string;
}

const SubtitleEditor = ({ subtitle, subtitleColor, onSubtitleChange, onColorChange, bgColor }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const brandColors = useBrandColors();

  // Local mirror — what the user sees and types into.
  const [localValue, setLocalValue] = useState(subtitle || "");

  // Track the last value we pushed upstream so we can distinguish
  // "the parent's prop changed because we pushed" from "the parent
  // changed because the admin switched rows." Only the latter should
  // overwrite the local value.
  const lastPushedRef = useRef(subtitle || "");

  useEffect(() => {
    // FOCUS PROTECTION: never overwrite while the user is typing here.
    if (document.activeElement === inputRef.current) return;
    if (subtitle !== lastPushedRef.current) {
      setLocalValue(subtitle || "");
      lastPushedRef.current = subtitle || "";
    }
  }, [subtitle]);

  // Debounced push to the parent (1s). Long enough to swallow a sentence,
  // short enough that auto-save still fires while the admin is thinking.
  const debouncedPush = useDebouncedCallback((value: string) => {
    lastPushedRef.current = value;
    onSubtitleChange(value);
  }, 1000);

  // Resolve writing surface. If a row bg is provided, mirror it and
  // pick a readable foreground; otherwise fall back to the admin's
  // neutral background tokens.
  const surfaceBg = bgColor || "hsl(var(--background))";
  const surfaceFg = useMemo(
    () => (subtitleColor ? subtitleColor : (bgColor ? pickForeground(bgColor) : "inherit")),
    [bgColor, subtitleColor]
  );

  return (
    <div
      className="rounded-lg p-3 space-y-2"
      style={{ backgroundColor: surfaceBg, border: "1px solid hsl(var(--border) / 0.5)" }}
    >
      <label className="font-body text-[10px] uppercase tracking-wider mb-1 block" style={{ color: pickForeground(surfaceBg), opacity: 0.7 }}>
        Subtitle <span className="opacity-60">(Architects Daughter font)</span>
      </label>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={localValue}
          onChange={(e) => {
            const next = e.target.value;
            setLocalValue(next);   // instant on-screen feedback
            debouncedPush(next);   // delayed upstream propagation
          }}
          onBlur={() => {
            // Flush so the parent definitely has the latest value
            // before we lose focus.
            debouncedPush.flush();
          }}
          placeholder="Optional subtitle…"
          className="flex-1 px-3 py-2 rounded-lg text-sm border bg-transparent"
          style={{
            borderColor: "hsl(var(--border))",
            fontFamily: "'Architects Daughter', cursive",
            color: surfaceFg,
          }}
        />
      </div>
      {localValue && (
        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          <span className="font-body text-[9px] uppercase tracking-wider mr-1" style={{ color: pickForeground(surfaceBg), opacity: 0.7 }}>
            Color:
          </span>
          {brandColors.slice(0, 6).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onColorChange(c.hex)}
              title={c.name}
              className="w-4 h-4 rounded-full border border-black/10 hover:scale-110 transition-transform"
              style={{
                backgroundColor: c.hex,
                outline: subtitleColor === c.hex ? "2px solid hsl(var(--primary))" : "none",
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
            style={{ color: pickForeground(surfaceBg), opacity: 0.7 }}>
            <Palette size={12} />
          </button>
          <button
            type="button"
            onClick={() => onColorChange("")}
            title="Reset color"
            className="p-1 rounded hover:opacity-70"
            style={{ color: pickForeground(surfaceBg), opacity: 0.7 }}>
            <RotateCcw size={11} />
          </button>
        </div>
      )}
    </div>
  );
};

export default SubtitleEditor;
