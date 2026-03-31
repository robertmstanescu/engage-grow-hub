import { Palette, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (html: string) => void;
}

const QUICK_COLORS = [
  { label: "Gold", value: "#E5C54F" },
  { label: "Violet", value: "#4D1B5E" },
  { label: "Plum", value: "#43143B" },
  { label: "White", value: "#F4F0EC" },
  { label: "Cream", value: "#F9F0C1" },
];

const TitleLineEditor = ({ value, onChange }: Props) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);

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
        {QUICK_COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            title={color.label}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyColor(color.value)}
            className="w-4 h-4 rounded-full border hover:scale-110 transition-transform"
            style={{ backgroundColor: color.value, borderColor: "hsl(var(--border))" }}
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
        style={{ color: "hsl(var(--foreground))" }}
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
