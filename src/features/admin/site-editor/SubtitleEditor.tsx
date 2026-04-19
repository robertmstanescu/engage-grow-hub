import { Palette, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";

/**
 * ─────────────────────────────────────────────────────────────────────────
 * SubtitleEditor — local state + debounced upstream push
 * ─────────────────────────────────────────────────────────────────────────
 *
 * KEYSTROKE-LAG ARCHITECTURE (junior-dev orientation)
 * ───────────────────────────────────────────────────
 * Previously this component called `onSubtitleChange` on EVERY keystroke,
 * which mutated the global `pageRows` blob in `AdminDashboard` and
 * cascaded a re-render through every editor on the page. Typing felt
 * janky — letters appeared in batches.
 *
 * Now the typed text lives in `localValue` (a plain `useState`), so what
 * the user sees on screen is updated synchronously and the cursor never
 * moves. We only push the value upstream after the user pauses for
 * 300ms, which collapses ~10 React re-renders per word into 1.
 *
 * The eventual upstream call is what triggers the SILENT auto-save
 * effect in `AdminDashboard`. That effect writes ONLY to `draft_content`
 * — the live `content` columns stay frozen until "Publish" is clicked.
 *
 * On blur we flush any pending push so we never lose the user's last
 * edit when they tab away.
 *
 * The `useEffect` reconciles `localValue` whenever the parent's `subtitle`
 * prop genuinely changes from outside (e.g. when the admin selects a
 * different row). It does NOT clobber the user's mid-typing state because
 * the parent only changes after we push upstream.
 * ─────────────────────────────────────────────────────────────────────────
 */

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

const SubtitleEditor = ({ subtitle, subtitleColor, onSubtitleChange, onColorChange }: Props) => {
  // Local mirror — what the user sees and types into.
  const [localValue, setLocalValue] = useState(subtitle || "");

  // Track the last value we pushed upstream so we can distinguish
  // "the parent's prop changed because we pushed" from "the parent
  // changed because the admin switched rows." Only the latter should
  // overwrite the local value.
  const lastPushedRef = useRef(subtitle || "");

  useEffect(() => {
    if (subtitle !== lastPushedRef.current) {
      setLocalValue(subtitle || "");
      lastPushedRef.current = subtitle || "";
    }
  }, [subtitle]);

  // Debounced push to the parent. 300ms feels instant to a user but
  // is more than long enough to coalesce a fast typist's keystrokes.
  const debouncedPush = useDebouncedCallback((value: string) => {
    lastPushedRef.current = value;
    onSubtitleChange(value);
  }, 300);

  return (
    <div>
      <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
        Subtitle <span className="text-muted-foreground/60">(Architects Daughter font)</span>
      </label>
      <div className="flex gap-2">
        <input
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
          className="flex-1 px-3 py-2 rounded-lg text-sm border"
          style={{
            borderColor: "hsl(var(--border))",
            backgroundColor: "hsl(var(--background))",
            fontFamily: "'Architects Daughter', cursive",
            color: subtitleColor || "inherit",
          }}
        />
      </div>
      {localValue && (
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
};

export default SubtitleEditor;
