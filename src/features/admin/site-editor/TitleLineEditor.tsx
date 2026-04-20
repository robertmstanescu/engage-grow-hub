import { Palette, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useBrandColors } from "@/hooks/useBrandSettings";
import { normalizeRichTextContainerFontSizes, normalizeRichTextHtml } from "@/services/richTextFontSize";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { pickForeground } from "@/lib/pickForeground";

/**
 * ─────────────────────────────────────────────────────────────────────────
 * KEYSTROKE-LAG ARCHITECTURE (junior-dev orientation)
 * ─────────────────────────────────────────────────────────────────────────
 * The user-visible text in this editor lives in the contentEditable DOM
 * node — NOT in React state. That means typing never schedules a React
 * re-render and the cursor is never disturbed by the parent's tree
 * rebuild. The on-screen letters appear instantly, no matter how slow
 * the parent is.
 *
 * What we DO need to send upstream is the resulting HTML so the global
 * `pageRows` blob in `AdminDashboard` matches what the user typed. That
 * propagation is debounced (1000ms): a burst of keystrokes fires
 * `onChange` once when the user pauses for a full second, instead of
 * once per letter. This long debounce gives the admin enough breathing
 * room to finish a thought before the global state cascade kicks in.
 *
 * FOCUS PROTECTION
 * ────────────────
 * The `useEffect` that mirrors the `value` prop into the contentEditable
 * is GUARDED: it skips the sync whenever this editor currently owns the
 * keyboard focus. Without that guard, an upstream re-render (often
 * caused by our own debounced push) could overwrite the in-flight
 * keystrokes and snap the cursor to the start of the line. With the
 * guard, the live DOM is left alone while the user is typing — the
 * value prop only "wins" when the user has moved on to another input.
 *
 * On `blur` we flush any pending debounce so closing the input never
 * loses an in-flight keystroke. Toolbar actions (color, font, etc.)
 * call `emitChangeNow` so formatting changes propagate immediately.
 * ─────────────────────────────────────────────────────────────────────────
 */

const FONT_OPTIONS = [
  { label: "Display", value: "var(--font-title)" },
  { label: "Body", value: "var(--font-body)" },
  { label: "Header", value: "var(--font-header)" },
  { label: "Handwritten", value: "'Architects Daughter', cursive" },
];

const SIZE_OPTIONS = ["14px", "18px", "24px", "32px", "44px", "56px"];

interface Props {
  value: string;
  onChange: (html: string) => void;
  /** Optional — when supplied, the editor surface mirrors this colour
   *  and the typed text auto-switches to a readable foreground via
   *  `pickForeground`. Used by RowContentEditor to thread the live row
   *  background down so admins see the real contrast while editing. */
  bgColor?: string;
}

const TitleLineEditor = ({ value, onChange, bgColor }: Props) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const brandColors = useBrandColors();

  // Resolve writing surface colours. Default to a white card if no row
  // bg is supplied (preserves old behaviour for callers that haven't
  // wired bgColor yet).
  const surfaceBg = bgColor || "#FFFFFF";
  const surfaceFg = useMemo(() => (bgColor ? pickForeground(bgColor) : "#1a1a1a"), [bgColor]);

  /**
   * emitChangeNow — IMMEDIATE upstream propagation. Used by toolbar
   * commands (color picker, font size, blur) where the user has clearly
   * finished an edit and we want the global state to reflect it ASAP.
   */
  const emitChangeNow = useCallback(() => {
    if (editorRef.current) {
      normalizeRichTextContainerFontSizes(editorRef.current);
    }
    onChange(normalizeRichTextHtml(editorRef.current?.innerHTML || ""));
  }, [onChange]);

  /**
   * emitChangeDebounced — deferred upstream propagation, used on every
   * keystroke. The user sees their letters instantly (contentEditable),
   * but the parent component is only notified once they pause for 1000ms.
   * That gives the admin time to finish a sentence before the global
   * cascade (and any auto-save) fires.
   */
  const debouncedPush = useDebouncedCallback((html: string) => {
    onChange(html);
  }, 1000);

  const emitChange = useCallback(() => {
    if (editorRef.current) {
      normalizeRichTextContainerFontSizes(editorRef.current);
    }
    debouncedPush(normalizeRichTextHtml(editorRef.current?.innerHTML || ""));
  }, [debouncedPush]);

  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;

    const range = selection.getRangeAt(0);
    if (editorRef.current.contains(range.commonAncestorContainer)) {
      selectionRef.current = range.cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || !selectionRef.current) return;

    selection.removeAllRanges();
    selection.addRange(selectionRef.current);
  }, []);

  const applyColor = useCallback(
    (color: string) => {
      editorRef.current?.focus();
      restoreSelection();
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("foreColor", false, color);
      if (editorRef.current) {
        normalizeRichTextContainerFontSizes(editorRef.current);
      }
    saveSelection();
      // Toolbar actions = explicit edit → push immediately, no debounce.
      emitChangeNow();
    },
    [emitChangeNow, restoreSelection, saveSelection]
  );

  const applyFontSize = useCallback((fontSize: string) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("fontSize", false, "7");
    if (editorRef.current) {
      normalizeRichTextContainerFontSizes(editorRef.current, fontSize);
    }
    saveSelection();
    emitChangeNow();
  }, [emitChangeNow, restoreSelection, saveSelection]);

  const setColor = useCallback(() => {
    const color = window.prompt("Enter color (hex):", "#E5C54F");
    if (color) applyColor(color);
  }, [applyColor]);

  const resetColor = useCallback(() => {
    applyColor(surfaceFg);
  }, [applyColor, surfaceFg]);

  // FOCUS-PROTECTED VALUE SYNC. While the user is actively typing in
  // this editor, do NOT overwrite the contentEditable from the prop —
  // doing so would snap the cursor and destroy in-flight keystrokes.
  // The prop only wins when this editor is not focused.
  useEffect(() => {
    if (!editorRef.current) return;
    if (document.activeElement === editorRef.current) return;
    if (editorRef.current.innerHTML !== (value || "")) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: "hsl(var(--border))", backgroundColor: surfaceBg }}
    >
      <div
        className="flex items-center gap-0.5 px-2 py-1 border-b"
        style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--muted) / 0.2)" }}
      >
        {brandColors.map((color) => (
          <button
            key={color.id}
            type="button"
            title={color.name}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyColor(color.hex)}
            className="w-4 h-4 rounded-full border hover:scale-110 transition-transform"
            style={{ backgroundColor: color.hex, borderColor: "hsl(var(--border))" }}
          />
        ))}
        <button
          type="button"
          title="Custom color"
          onMouseDown={(event) => event.preventDefault()}
          onClick={setColor}
          className="p-1 rounded hover:opacity-70"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          <Palette size={12} />
        </button>
        <select
          defaultValue=""
          onMouseDown={(event) => event.preventDefault()}
          onChange={(event) => {
            if (!event.target.value) return;
            editorRef.current?.focus();
            restoreSelection();
            document.execCommand("styleWithCSS", false, "true");
            document.execCommand("fontName", false, event.target.value);
            saveSelection();
            // Toolbar = explicit edit → push immediately, no debounce.
            emitChangeNow();
            event.target.value = "";
          }}
          className="font-body text-[10px] px-1 py-0.5 rounded border bg-transparent cursor-pointer"
          style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", maxWidth: "92px" }}
          title="Font family"
        >
          <option value="">Font</option>
          {FONT_OPTIONS.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
        </select>
        <select
          defaultValue=""
          onMouseDown={(event) => event.preventDefault()}
          onChange={(event) => {
            if (event.target.value) applyFontSize(event.target.value);
            event.target.value = "";
          }}
          className="font-body text-[10px] px-1 py-0.5 rounded border bg-transparent cursor-pointer"
          style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", maxWidth: "72px" }}
          title="Font size"
        >
          <option value="">Size</option>
          {SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size.replace("px", "")}</option>)}
        </select>
        <button
          type="button"
          title="Reset color"
          onMouseDown={(event) => event.preventDefault()}
          onClick={resetColor}
          className="p-1 rounded hover:opacity-70"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          <RotateCcw size={11} />
        </button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        className="focus:outline-none px-3 py-2 font-display text-sm min-h-[36px]"
        style={{ color: surfaceFg, backgroundColor: surfaceBg }}
        onInput={emitChange}
        onBlur={() => {
          saveSelection();
          // Flush pending debounce + push the final value synchronously
          // so the parent never misses the user's last keystroke.
          debouncedPush.cancel();
          emitChangeNow();
        }}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
      />
    </div>
  );
};

export default TitleLineEditor;
