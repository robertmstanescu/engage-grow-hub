import { Palette, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { useBrandColors } from "@/hooks/useBrandSettings";

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
}

const TitleLineEditor = ({ value, onChange }: Props) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const brandColors = useBrandColors();

  const emitChange = useCallback(() => {
    onChange(editorRef.current?.innerHTML || "");
  }, [onChange]);

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
      saveSelection();
      emitChange();
    },
    [emitChange, restoreSelection, saveSelection]
  );

  const applyFontSize = useCallback((fontSize: string) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("fontSize", false, "7");
    editorRef.current?.querySelectorAll('font[size="7"]').forEach((node) => {
      const span = document.createElement("span");
      span.style.fontSize = fontSize;
      span.innerHTML = node.innerHTML;
      node.replaceWith(span);
    });
    saveSelection();
    emitChange();
  }, [emitChange, restoreSelection, saveSelection]);

  const setColor = useCallback(() => {
    const color = window.prompt("Enter color (hex):", "#E5C54F");
    if (color) applyColor(color);
  }, [applyColor]);

  const resetColor = useCallback(() => {
    const foreground = getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim();
    applyColor(foreground ? `hsl(${foreground})` : "#111111");
  }, [applyColor]);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== (value || "")) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: "hsl(var(--border))", backgroundColor: "#FFFFFF" }}
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
            emitChange();
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
        style={{ color: "#1a1a1a" }}
        onInput={emitChange}
        onBlur={() => {
          saveSelection();
          emitChange();
        }}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
      />
    </div>
  );
};

export default TitleLineEditor;
