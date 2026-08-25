import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Highlighter,
  Undo,
  Redo,
  RemoveFormatting,
  Code,
  LetterText,
  Heading2,
  Heading3,
  Minus,
  Images,
} from "lucide-react";
import { toast } from "sonner";
import { Extension } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle, Color, FontFamily, FontSize } from "@tiptap/extension-text-style";
import { sanitizeHtml } from "@/services/sanitize";
import { uploadEditorImage } from "@/services/mediaStorage";
import { runDbAction } from "@/services/db-helpers";
import { useBrandColors } from "@/hooks/useBrandSettings";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import MediaGallery from "./MediaGallery";

/**
 * ─────────────────────────────────────────────────────────────────────────
 * RichTextEditor — TipTap (ProseMirror) implementation
 * ─────────────────────────────────────────────────────────────────────────
 * The previous editor drove a raw `contentEditable` through
 * `document.execCommand`, a deprecated browser API whose behaviour differs
 * per browser — which is why Italic and friends misfired. TipTap keeps its
 * own document model and serialises predictable, semantic HTML:
 *
 *   <p>, <strong>, <em>, <u>, <s>, <h2>, <h3>, <ul>/<ol>/<li>,
 *   <blockquote>, <a>, <img>, <hr>, and <span style="…"> only where the
 *   admin explicitly picked a colour / size / font.
 *
 * PUBLIC INTERFACE IS UNCHANGED — `content`, `onChange`, `placeholder`,
 * `bgColor`. Every call site (BlogEditor, RowContentEditor, InspectorPanel,
 * EmailBlockEditor, FieldComponents, AdminDashboard) keeps working.
 *
 * SAVE DISCIPLINE
 * ---------------
 *   • Typing → `onUpdate` → 600 ms debounce → `onChange(html)`.
 *   • Toolbar actions also flow through the same debounce; blur flushes.
 *   • The editor never re-parses `content` while it has focus, so an
 *     upstream re-render can't stomp on in-flight keystrokes.
 *
 * SOURCE VIEW
 * -----------
 * The <Code/> button swaps the canvas for a textarea containing the raw
 * HTML. Editing there and switching back re-parses the markup into the
 * document model (sanitised first).
 * ─────────────────────────────────────────────────────────────────────────
 */

const FONT_OPTIONS = [
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Architects Daughter", value: "'Architects Daughter', cursive" },
  { label: "Bricolage Grotesque", value: "'Bricolage Grotesque', sans-serif" },
];

const SIZE_OPTIONS = [
  "12px", "14px", "16px", "18px", "20px", "24px", "30px", "36px", "48px", "60px", "72px",
];

/**
 * DropCapAttribute — adds an optional `class="drop-cap"` to the textStyle
 * mark so the historic drop-cap styling in `index.css` keeps working.
 */
const DropCapAttribute = Extension.create({
  name: "dropCapAttribute",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          dropCap: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              element.classList.contains("drop-cap") ? true : null,
            renderHTML: (attributes: Record<string, unknown>) =>
              attributes.dropCap ? { class: "drop-cap" } : {},
          },
        },
      },
    ];
  },
});

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Background colour of the row this content renders on, mirrored on the canvas. */
  bgColor?: string;
}

const ToolbarButton = ({
  onClick, children, title, active,
}: {
  onClick: () => void; children: React.ReactNode; title: string; active?: boolean;
}) => (
  <button
    type="button"
    title={title}
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    className="p-1.5 rounded transition-colors"
    style={{
      color: active ? "hsl(var(--secondary))" : "hsl(var(--muted-foreground))",
      backgroundColor: active ? "hsl(var(--secondary) / 0.15)" : undefined,
    }}
  >
    {children}
  </button>
);

const Divider = () => (
  <div className="w-px mx-1 h-5" style={{ backgroundColor: "hsl(var(--border))" }} />
);

const RichTextEditor = ({ content, onChange, placeholder, bgColor }: RichTextEditorProps) => {
  const brandColors = useBrandColors();
  const [htmlMode, setHtmlMode] = useState(false);
  const [htmlDraft, setHtmlDraft] = useState("");
  const [showGallery, setShowGallery] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Last HTML we pushed upstream — guards the incoming-prop sync. */
  const lastEmittedRef = useRef<string>(content || "");

  const emit = useCallback((html: string) => {
    lastEmittedRef.current = html;
    onChange(html);
  }, [onChange]);

  const debouncedEmit = useDebouncedCallback((html: string) => emit(html), 600);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      DropCapAttribute,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ inline: false, HTMLAttributes: { style: "max-width:100%;height:auto" } }),
      Placeholder.configure({ placeholder: placeholder || "Start writing..." }),
    ],
    content: sanitizeHtml(content || ""),
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[300px] px-4 py-3 focus:outline-none",
      },
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData("text/plain");
        if (text === undefined) return false;
        view.dispatch(view.state.tr.insertText(text));
        return true;
      },
    },
    // Paste as plain text deliberately: copied typography, colours and
    // layout from Word/Docs/web pages must never leak into site content.
    onUpdate: ({ editor: instance }) => {
      debouncedEmit(instance.getHTML());
    },
    onBlur: ({ editor: instance }) => {
      emit(instance.getHTML());
    },
  });

  /** Incoming prop → editor, but never while the admin is typing. */
  useEffect(() => {
    if (!editor || htmlMode) return;
    if (editor.isFocused) return;
    const next = sanitizeHtml(content || "");
    if (next === lastEmittedRef.current) return;
    if (next === editor.getHTML()) return;
    editor.commands.setContent(next, { emitUpdate: false });
    lastEmittedRef.current = next;
  }, [content, editor, htmlMode]);

  const toggleHtmlMode = useCallback(() => {
    if (!editor) return;
    if (htmlMode) {
      const clean = sanitizeHtml(htmlDraft);
      editor.commands.setContent(clean, { emitUpdate: false });
      emit(editor.getHTML());
      setHtmlMode(false);
    } else {
      setHtmlDraft(editor.getHTML());
      setHtmlMode(true);
    }
  }, [editor, htmlMode, htmlDraft, emit]);

  const insertImage = useCallback((url: string) => {
    if (!editor || !url) return;
    editor.chain().focus().setImage({ src: url }).run();
    emit(editor.getHTML());
  }, [editor, emit]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    const result = await runDbAction({
      action: () => uploadEditorImage("rte", file),
      successMessage: "Image uploaded",
      errorMessage: "Failed to upload image",
    });
    if (result?.publicUrl) insertImage(result.publicUrl);
  }, [insertImage]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter URL (leave empty to remove):", previous || "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else if (editor.state.selection.empty) {
      editor.chain().focus().insertContent(
        `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`,
      ).run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    emit(editor.getHTML());
  }, [editor, emit]);

  const setTextColor = useCallback(() => {
    if (!editor) return;
    const color = window.prompt("Enter color (hex, e.g. #4D1B5E):", "#000000");
    if (!color) return;
    editor.chain().focus().setColor(color).run();
    emit(editor.getHTML());
  }, [editor, emit]);

  const setHighlightColor = useCallback(() => {
    if (!editor) return;
    const color = window.prompt("Highlight color (hex):", "#FFF176");
    if (!color) return;
    editor.chain().focus().toggleHighlight({ color }).run();
    emit(editor.getHTML());
  }, [editor, emit]);

  const toggleDropCap = useCallback(() => {
    if (!editor) return;
    const active = editor.getAttributes("textStyle").dropCap;
    if (active) editor.chain().focus().setMark("textStyle", { dropCap: null }).run();
    else editor.chain().focus().setMark("textStyle", { dropCap: true }).run();
    emit(editor.getHTML());
  }, [editor, emit]);

  const run = useCallback((fn: () => void) => {
    fn();
    if (editor) emit(editor.getHTML());
  }, [editor, emit]);

  if (!editor) return null;

  const activeFont = (editor.getAttributes("textStyle").fontFamily as string) || "";
  const activeSize = (editor.getAttributes("textStyle").fontSize as string) || "";

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: "hsl(var(--border))", backgroundColor: bgColor || "transparent" }}
    >
      <div
        className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b"
        style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--muted) / 0.3)" }}
      >
        <ToolbarButton onClick={() => run(() => editor.chain().focus().undo().run())} title="Undo"><Undo size={15} /></ToolbarButton>
        <ToolbarButton onClick={() => run(() => editor.chain().focus().redo().run())} title="Redo"><Redo size={15} /></ToolbarButton>

        <Divider />

        <select
          value={activeFont}
          onChange={(e) => run(() => {
            const v = e.target.value;
            if (v) editor.chain().focus().setFontFamily(v).run();
            else editor.chain().focus().unsetFontFamily().run();
          })}
          className="font-body text-[10px] px-1.5 py-1 rounded border bg-transparent cursor-pointer"
          style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", maxWidth: "120px" }}
          title="Font Family"
        >
          <option value="">Font</option>
          {FONT_OPTIONS.map((font) => (
            <option key={font.value} value={font.value}>{font.label}</option>
          ))}
        </select>

        <select
          value={SIZE_OPTIONS.includes(activeSize) ? activeSize : ""}
          onChange={(e) => run(() => {
            const v = e.target.value;
            if (v) editor.chain().focus().setFontSize(v).run();
            else editor.chain().focus().unsetFontSize().run();
          })}
          className="font-body text-[10px] px-1.5 py-1 rounded border bg-transparent cursor-pointer"
          style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", maxWidth: "85px" }}
          title="Font Size"
        >
          <option value="">Size</option>
          {SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>

        <Divider />

        <ToolbarButton active={editor.isActive("bold")} onClick={() => run(() => editor.chain().focus().toggleBold().run())} title="Bold"><Bold size={15} /></ToolbarButton>
        <ToolbarButton active={editor.isActive("italic")} onClick={() => run(() => editor.chain().focus().toggleItalic().run())} title="Italic"><Italic size={15} /></ToolbarButton>
        <ToolbarButton active={editor.isActive("underline")} onClick={() => run(() => editor.chain().focus().toggleUnderline().run())} title="Underline"><UnderlineIcon size={15} /></ToolbarButton>
        <ToolbarButton active={editor.isActive("strike")} onClick={() => run(() => editor.chain().focus().toggleStrike().run())} title="Strikethrough"><Strikethrough size={15} /></ToolbarButton>
        <ToolbarButton active={editor.isActive("code")} onClick={() => run(() => editor.chain().focus().toggleCode().run())} title="Inline code"><Code size={15} /></ToolbarButton>

        <Divider />

        <ToolbarButton active={editor.isActive("heading", { level: 2 })} onClick={() => run(() => editor.chain().focus().toggleHeading({ level: 2 }).run())} title="Heading 2"><Heading2 size={15} /></ToolbarButton>
        <ToolbarButton active={editor.isActive("heading", { level: 3 })} onClick={() => run(() => editor.chain().focus().toggleHeading({ level: 3 }).run())} title="Heading 3"><Heading3 size={15} /></ToolbarButton>

        <Divider />

        {brandColors.slice(0, 8).map((c) => (
          <button key={c.id} type="button" title={c.name}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run(() => editor.chain().focus().setColor(c.hex).run())}
            className="w-4 h-4 rounded-full border hover:scale-110 transition-transform"
            style={{ backgroundColor: c.hex, borderColor: "hsl(var(--border))" }} />
        ))}
        <ToolbarButton onClick={setTextColor} title="Custom Text Color"><Palette size={15} /></ToolbarButton>
        <ToolbarButton active={editor.isActive("highlight")} onClick={setHighlightColor} title="Highlight"><Highlighter size={15} /></ToolbarButton>

        <Divider />

        <ToolbarButton active={editor.isActive({ textAlign: "left" })} onClick={() => run(() => editor.chain().focus().setTextAlign("left").run())} title="Align Left"><AlignLeft size={15} /></ToolbarButton>
        <ToolbarButton active={editor.isActive({ textAlign: "center" })} onClick={() => run(() => editor.chain().focus().setTextAlign("center").run())} title="Align Center"><AlignCenter size={15} /></ToolbarButton>
        <ToolbarButton active={editor.isActive({ textAlign: "right" })} onClick={() => run(() => editor.chain().focus().setTextAlign("right").run())} title="Align Right"><AlignRight size={15} /></ToolbarButton>
        <ToolbarButton active={editor.isActive({ textAlign: "justify" })} onClick={() => run(() => editor.chain().focus().setTextAlign("justify").run())} title="Justify"><AlignJustify size={15} /></ToolbarButton>

        <Divider />

        <ToolbarButton active={editor.isActive("bulletList")} onClick={() => run(() => editor.chain().focus().toggleBulletList().run())} title="Bullet List"><List size={15} /></ToolbarButton>
        <ToolbarButton active={editor.isActive("orderedList")} onClick={() => run(() => editor.chain().focus().toggleOrderedList().run())} title="Numbered List"><ListOrdered size={15} /></ToolbarButton>
        <ToolbarButton active={editor.isActive("blockquote")} onClick={() => run(() => editor.chain().focus().toggleBlockquote().run())} title="Blockquote"><Quote size={15} /></ToolbarButton>
        <ToolbarButton onClick={() => run(() => editor.chain().focus().setHorizontalRule().run())} title="Divider"><Minus size={15} /></ToolbarButton>

        <Divider />

        <ToolbarButton active={!!editor.getAttributes("textStyle").dropCap} onClick={toggleDropCap} title="Drop Cap / Initial Letter"><LetterText size={15} /></ToolbarButton>
        <ToolbarButton active={editor.isActive("link")} onClick={addLink} title="Add Link"><LinkIcon size={15} /></ToolbarButton>
        <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Upload Image"><ImageIcon size={15} /></ToolbarButton>
        <ToolbarButton onClick={() => setShowGallery(true)} title="Insert from Media Gallery"><Images size={15} /></ToolbarButton>

        <Divider />

        <ToolbarButton onClick={() => run(() => editor.chain().focus().unsetAllMarks().clearNodes().run())} title="Remove Formatting"><RemoveFormatting size={15} /></ToolbarButton>
        <ToolbarButton onClick={toggleHtmlMode} title="HTML Source" active={htmlMode}><Code size={15} /></ToolbarButton>
      </div>

      {htmlMode ? (
        <textarea
          value={htmlDraft}
          onChange={(e) => setHtmlDraft(e.target.value)}
          onBlur={() => emit(sanitizeHtml(htmlDraft))}
          spellCheck={false}
          className="w-full min-h-[300px] px-4 py-3 font-mono text-xs focus:outline-none resize-y"
          style={{ color: "hsl(var(--foreground))", backgroundColor: "hsl(var(--background))", border: "none" }}
        />
      ) : (
        <EditorContent editor={editor} />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }}
      />

      {showGallery && (
        <MediaGallery
          isModal
          mimeFilter={(mime) => !!mime && mime.startsWith("image/")}
          onSelect={(url) => { insertImage(url); setShowGallery(false); }}
          onClose={() => setShowGallery(false)}
        />
      )}
    </div>
  );
};

export default RichTextEditor;
