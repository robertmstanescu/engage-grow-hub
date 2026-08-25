import { Bold, Italic, Palette, RemoveFormatting, RotateCcw, Underline as UnderlineIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Color, FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { useBrandColors } from "@/hooks/useBrandSettings";
import { normalizeRichTextHtml } from "@/services/richTextFontSize";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { pickForeground } from "@/lib/pickForeground";
import { sanitizeHtml } from "@/services/sanitize";

/**
 * ─────────────────────────────────────────────────────────────────────────
 * RELIABLE TITLE FORMATTING
 * ─────────────────────────────────────────────────────────────────────────
 * This compact TipTap instance replaces the final `document.execCommand`
 * editor in the page builder. It keeps one paragraph per visual title line,
 * emits semantic marks such as <strong> and <em>, and pastes plain text so
 * external formatting can never contaminate the site's typography.
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
  const brandColors = useBrandColors();
  const lastEmittedRef = useRef(value || "");

  // Resolve writing surface colours. Default to a white card if no row
  // bg is supplied (preserves old behaviour for callers that haven't
  // wired bgColor yet).
  const surfaceBg = bgColor || "#FFFFFF";
  const surfaceFg = useMemo(() => (bgColor ? pickForeground(bgColor) : "#1a1a1a"), [bgColor]);

  const emit = useCallback((html: string) => {
    const normalized = normalizeRichTextHtml(html);
    lastEmittedRef.current = normalized;
    onChange(normalized);
  }, [onChange]);

  const debouncedEmit = useDebouncedCallback((html: string) => emit(html), 1000);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
      }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
    ],
    content: sanitizeHtml(value || "<p></p>"),
    editorProps: {
      attributes: {
        class: "focus:outline-none px-3 py-2 font-display text-sm min-h-[36px]",
        "aria-label": "Title line",
      },
      handleKeyDown: (_view, event) => {
        if (event.key !== "Enter") return false;
        event.preventDefault();
        return true;
      },
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData("text/plain");
        if (text === undefined) return false;
        view.dispatch(view.state.tr.insertText(text.replace(/\s*\n+\s*/g, " ")));
        return true;
      },
    },
    onUpdate: ({ editor: instance }) => debouncedEmit(instance.getHTML()),
    onBlur: ({ editor: instance }) => {
      debouncedEmit.cancel();
      emit(instance.getHTML());
    },
  });

  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const next = sanitizeHtml(value || "<p></p>");
    if (next === lastEmittedRef.current || next === editor.getHTML()) return;
    editor.commands.setContent(next, { emitUpdate: false });
    lastEmittedRef.current = next;
  }, [editor, value]);

  const run = useCallback((command: () => void) => {
    command();
    if (editor) emit(editor.getHTML());
  }, [editor, emit]);

  const applyColor = useCallback(
    (color: string) => {
      if (!editor) return;
      run(() => editor.chain().focus().setColor(color).run());
    },
    [editor, run]
  );

  const applyFontSize = useCallback((fontSize: string) => {
    if (!editor) return;
    run(() => editor.chain().focus().setFontSize(fontSize).run());
  }, [editor, run]);

  const setColor = useCallback(() => {
    const color = window.prompt("Enter color (hex):", "#E5C54F");
    if (color) applyColor(color);
  }, [applyColor]);

  const resetColor = useCallback(() => {
    if (!editor) return;
    run(() => editor.chain().focus().unsetColor().run());
  }, [editor, run]);

  if (!editor) return null;

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
        <button type="button" title="Bold" aria-label="Bold"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run(() => editor.chain().focus().toggleBold().run())}
          className="p-1 rounded hover:opacity-70"
          style={{ color: editor.isActive("bold") ? "hsl(var(--secondary))" : "hsl(var(--muted-foreground))" }}>
          <Bold size={12} />
        </button>
        <button type="button" title="Italic" aria-label="Italic"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run(() => editor.chain().focus().toggleItalic().run())}
          className="p-1 rounded hover:opacity-70"
          style={{ color: editor.isActive("italic") ? "hsl(var(--secondary))" : "hsl(var(--muted-foreground))" }}>
          <Italic size={12} />
        </button>
        <button type="button" title="Underline" aria-label="Underline"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run(() => editor.chain().focus().toggleUnderline().run())}
          className="p-1 rounded hover:opacity-70"
          style={{ color: editor.isActive("underline") ? "hsl(var(--secondary))" : "hsl(var(--muted-foreground))" }}>
          <UnderlineIcon size={12} />
        </button>
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
            run(() => editor.chain().focus().setFontFamily(event.target.value).run());
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
        <button type="button" title="Clear formatting" aria-label="Clear formatting"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run(() => editor.chain().focus().unsetAllMarks().run())}
          className="p-1 rounded hover:opacity-70"
          style={{ color: "hsl(var(--muted-foreground))" }}>
          <RemoveFormatting size={11} />
        </button>
      </div>

      <div style={{ color: surfaceFg, backgroundColor: surfaceBg }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default TitleLineEditor;
