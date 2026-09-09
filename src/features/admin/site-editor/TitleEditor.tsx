import { Bold, Italic, Palette, RemoveFormatting } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Color, FontFamily, TextStyle } from "@tiptap/extension-text-style";
import { useBrandColors } from "@/hooks/useBrandSettings";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { pickForeground } from "@/lib/pickForeground";
import { sanitizeHtml } from "@/services/sanitize";
import { splitTitleHtml } from "./titleHtml";

/**
 * TitleEditor — ONE box for the whole title.
 *
 * A title is stored as `title_lines: string[]`, one HTML paragraph per
 * visual line. The old editor gave every line its own card and its own
 * seventeen-button toolbar. This one shows the title the way it reads:
 * one box, one line per row. Enter starts a new line, Backspace at the
 * start of a line joins it to the previous one, and the formatting
 * tools (bold, italic, brand colours, clear) appear only while some
 * words are selected, in a small strip on the box's top edge.
 *
 * The stored shape does not change: `getHTML()` is split back into its
 * paragraphs, so every renderer keeps reading exactly what it read.
 */

interface Props {
  lines: string[];
  onChange: (lines: string[]) => void;
  /** Live row background: the box mirrors it so contrast is real. */
  bgColor?: string;
  label?: string;
}

const TitleEditor = ({ lines, onChange, bgColor, label = "Title" }: Props) => {
  const brandColors = useBrandColors();
  const joined = useMemo(() => sanitizeHtml((lines.length ? lines : ["<p></p>"]).join("")), [lines]);
  const lastEmittedRef = useRef(joined);
  const [hasSelection, setHasSelection] = useState(false);

  const surfaceBg = bgColor || "hsl(var(--card))";
  const surfaceFg = bgColor ? pickForeground(bgColor) : "hsl(var(--foreground))";

  const emit = useCallback((html: string) => {
    lastEmittedRef.current = sanitizeHtml(html);
    onChange(splitTitleHtml(html));
  }, [onChange]);
  const debouncedEmit = useDebouncedCallback((html: string) => emit(html), 800);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, blockquote: false, bulletList: false, orderedList: false, codeBlock: false, horizontalRule: false, link: false, underline: false, strike: false, code: false }),
      TextStyle,
      Color,
      FontFamily,
    ],
    content: joined,
    editorProps: {
      attributes: { class: "focus:outline-none px-3 py-2 font-display text-[15px] leading-snug min-h-[44px] title-editor-content", "aria-label": label },
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData("text/plain");
        if (text === undefined) return false;
        const paragraphs = text.split(/\r?\n+/).map((t) => t.trim()).filter(Boolean);
        view.dispatch(view.state.tr.insertText(paragraphs.join("\n")));
        return true;
      },
    },
    onUpdate: ({ editor: instance }) => debouncedEmit(instance.getHTML()),
    onBlur: ({ editor: instance }) => { debouncedEmit.cancel(); emit(instance.getHTML()); setHasSelection(false); },
    onSelectionUpdate: ({ editor: instance }) => setHasSelection(!instance.state.selection.empty),
    onFocus: ({ editor: instance }) => setHasSelection(!instance.state.selection.empty),
  });

  useEffect(() => {
    if (!editor || editor.isFocused) return;
    if (joined === lastEmittedRef.current || joined === sanitizeHtml(editor.getHTML())) return;
    editor.commands.setContent(joined, { emitUpdate: false });
    lastEmittedRef.current = joined;
  }, [editor, joined]);

  const run = useCallback((fn: () => void) => { fn(); if (editor) emit(editor.getHTML()); }, [editor, emit]);

  if (!editor) return null;

  const lineCount = editor.state.doc.childCount;

  return (
    <div className="title-editor" data-inspector-field="title">
      <div className="flex items-center justify-between mb-1">
        <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
        {!hasSelection && <span className="font-body text-[10px] text-muted-foreground">{lineCount === 1 ? "1 line · Enter for a new line" : `${lineCount} lines`}</span>}
      </div>
      <div className="relative rounded-md border admin-canvas" style={{ borderColor: "hsl(var(--input))", backgroundColor: surfaceBg, color: surfaceFg }}>
        {hasSelection && (
          <div
            role="toolbar"
            aria-label="Format selection"
            className="absolute -top-3 right-2 z-10 flex items-center gap-0.5 px-1 py-0.5 admin-menu"
            onMouseDown={(e) => e.preventDefault()}
          >
            <button type="button" title="Bold" aria-label="Bold" className="admin-btn ghost icon" aria-pressed={editor.isActive("bold")} onClick={() => run(() => editor.chain().focus().toggleBold().run())}><Bold size={12} /></button>
            <button type="button" title="Italic" aria-label="Italic" className="admin-btn ghost icon" aria-pressed={editor.isActive("italic")} onClick={() => run(() => editor.chain().focus().toggleItalic().run())}><Italic size={12} /></button>
            <span className="w-px h-4 mx-0.5" style={{ background: "hsl(var(--input))" }} />
            {brandColors.slice(0, 8).map((c) => (
              <button key={c.id} type="button" title={c.name} aria-label={`Colour ${c.name}`} className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: c.hex, borderColor: "hsl(var(--input))" }} onClick={() => run(() => editor.chain().focus().setColor(c.hex).run())} />
            ))}
            <button type="button" title="Other colour" aria-label="Other colour" className="admin-btn ghost icon" onClick={() => { const c = window.prompt("Colour (hex):", "#E5C54F"); if (c) run(() => editor.chain().focus().setColor(c).run()); }}><Palette size={12} /></button>
            <button type="button" title="Clear formatting" aria-label="Clear formatting" className="admin-btn ghost icon" onClick={() => run(() => editor.chain().focus().unsetAllMarks().run())}><RemoveFormatting size={12} /></button>
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default TitleEditor;
