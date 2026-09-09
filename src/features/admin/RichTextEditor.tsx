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
  Palette,
  Highlighter,
  RemoveFormatting,
  MoreHorizontal,
  Upload,
  Code,
  LetterText,
  Heading2,
  Heading3,
  Minus,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Extension } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle, Color, FontFamily } from "@tiptap/extension-text-style";
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

/** One row of the More menu. */
const MoreItem = ({ onClick, icon, children, active }: { onClick: () => void; icon: React.ReactNode; children: React.ReactNode; active?: boolean }) => (
  <button
    type="button"
    role="menuitem"
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    aria-pressed={active}
    className="admin-menu-item w-full"
  >
    <span className="inline-flex items-center gap-2" style={{ color: active ? "hsl(var(--foreground))" : undefined }}>{icon}{children}</span>
    {active && <span className="admin-dot" style={{ background: "hsl(var(--foreground))" }} />}
  </button>
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

  return (
    /* No `overflow-hidden` here: any clipping ancestor becomes the
       sticky toolbar's scroll container, so the bar would pin itself to
       a box that never scrolls and ride off the top with the article.
       The bottom corners are rounded on the content below instead. */
    <div
      className="rounded-md border"
      style={{ borderColor: "hsl(var(--border))" }}
    >
      {/* Eight things people reach for, then everything else under More.
          Undo/redo live on the keyboard and in the builder toolbar. */}
      <div
        className="sticky top-0 z-20 flex flex-wrap items-center gap-0.5 rounded-t-md border-b px-1.5 py-1 backdrop-blur"
        style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card) / 0.95)" }}
      >
        <ToolbarButton active={editor.isActive("bold")} onClick={() => run(() => editor.chain().focus().toggleBold().run())} title="Bold"><Bold size={15} /></ToolbarButton>
        <ToolbarButton active={editor.isActive("italic")} onClick={() => run(() => editor.chain().focus().toggleItalic().run())} title="Italic"><Italic size={15} /></ToolbarButton>
        <ToolbarButton active={editor.isActive("link")} onClick={addLink} title="Link"><LinkIcon size={15} /></ToolbarButton>
        <Divider />
        <ToolbarButton active={editor.isActive("heading", { level: 2 })} onClick={() => run(() => editor.chain().focus().toggleHeading({ level: 2 }).run())} title="Heading"><Heading2 size={15} /></ToolbarButton>
        <ToolbarButton active={editor.isActive("bulletList")} onClick={() => run(() => editor.chain().focus().toggleBulletList().run())} title="List"><List size={15} /></ToolbarButton>
        <ToolbarButton active={editor.isActive("blockquote")} onClick={() => run(() => editor.chain().focus().toggleBlockquote().run())} title="Quote"><Quote size={15} /></ToolbarButton>
        <Divider />
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" title="Colour" aria-label="Colour" onMouseDown={(e) => e.preventDefault()} className="p-1.5 rounded transition-colors" style={{ color: "hsl(var(--muted-foreground))" }}><Palette size={15} /></button>
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={4} className="admin-menu p-2 w-auto">
            <div className="flex items-center gap-1.5 flex-wrap max-w-[200px]">
              {brandColors.map((c) => (
                <button key={c.id} type="button" title={c.name} aria-label={`Colour ${c.name}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => run(() => editor.chain().focus().setColor(c.hex).run())}
                  className="w-5 h-5 rounded-full border"
                  style={{ backgroundColor: c.hex, borderColor: "hsl(var(--input))" }} />
              ))}
              <button type="button" className="admin-btn ghost" onMouseDown={(e) => e.preventDefault()} onClick={setTextColor}>Other…</button>
              <button type="button" className="admin-btn ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => run(() => editor.chain().focus().unsetColor().run())}>Default</button>
            </div>
          </PopoverContent>
        </Popover>
        <ToolbarButton onClick={() => setShowGallery(true)} title="Picture"><ImageIcon size={15} /></ToolbarButton>
        <span className="flex-1" />
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" title="More formatting" aria-label="More formatting" onMouseDown={(e) => e.preventDefault()} className="p-1.5 rounded transition-colors" style={{ color: "hsl(var(--muted-foreground))" }}><MoreHorizontal size={15} /></button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={4} className="admin-menu p-1 w-[220px]" role="menu" aria-label="More formatting">
            <MoreItem active={editor.isActive("underline")} onClick={() => run(() => editor.chain().focus().toggleUnderline().run())} icon={<UnderlineIcon size={13} />}>Underline</MoreItem>
            <MoreItem active={editor.isActive("strike")} onClick={() => run(() => editor.chain().focus().toggleStrike().run())} icon={<Strikethrough size={13} />}>Strikethrough</MoreItem>
            <MoreItem active={editor.isActive("highlight")} onClick={setHighlightColor} icon={<Highlighter size={13} />}>Highlight</MoreItem>
            <MoreItem active={editor.isActive("code")} onClick={() => run(() => editor.chain().focus().toggleCode().run())} icon={<Code size={13} />}>Code</MoreItem>
            <div className="admin-menu-sep" />
            <MoreItem active={editor.isActive("heading", { level: 3 })} onClick={() => run(() => editor.chain().focus().toggleHeading({ level: 3 }).run())} icon={<Heading3 size={13} />}>Small heading</MoreItem>
            <MoreItem active={editor.isActive("orderedList")} onClick={() => run(() => editor.chain().focus().toggleOrderedList().run())} icon={<ListOrdered size={13} />}>Numbered list</MoreItem>
            <MoreItem onClick={() => run(() => editor.chain().focus().setHorizontalRule().run())} icon={<Minus size={13} />}>Divider line</MoreItem>
            <MoreItem active={!!editor.getAttributes("textStyle").dropCap} onClick={toggleDropCap} icon={<LetterText size={13} />}>Big first letter</MoreItem>
            <div className="admin-menu-sep" />
            <MoreItem active={editor.isActive({ textAlign: "left" })} onClick={() => run(() => editor.chain().focus().setTextAlign("left").run())} icon={<AlignLeft size={13} />}>Align left</MoreItem>
            <MoreItem active={editor.isActive({ textAlign: "center" })} onClick={() => run(() => editor.chain().focus().setTextAlign("center").run())} icon={<AlignCenter size={13} />}>Align centre</MoreItem>
            <MoreItem active={editor.isActive({ textAlign: "right" })} onClick={() => run(() => editor.chain().focus().setTextAlign("right").run())} icon={<AlignRight size={13} />}>Align right</MoreItem>
            <div className="admin-menu-sep" />
            <div className="px-2 py-1 flex items-center gap-2">
              <span className="text-[11px]" style={{ color: "hsl(var(--muted-foreground))" }}>Font</span>
              <select
                value={activeFont}
                onChange={(e) => run(() => {
                  const v = e.target.value;
                  if (v) editor.chain().focus().setFontFamily(v).run();
                  else editor.chain().focus().unsetFontFamily().run();
                })}
                className="admin-input"
                style={{ padding: "3px 6px", fontSize: 11 }}
                aria-label="Font"
              >
                <option value="">Site default</option>
                {FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value}>{font.label}</option>
                ))}
              </select>
            </div>
            <div className="admin-menu-sep" />
            <MoreItem onClick={() => fileInputRef.current?.click()} icon={<Upload size={13} />}>Upload a picture</MoreItem>
            <MoreItem onClick={() => run(() => editor.chain().focus().unsetAllMarks().clearNodes().run())} icon={<RemoveFormatting size={13} />}>Clear formatting</MoreItem>
            <MoreItem active={htmlMode} onClick={toggleHtmlMode} icon={<Code size={13} />}>Edit as HTML</MoreItem>
          </PopoverContent>
        </Popover>
      </div>

      {htmlMode ? (
        <textarea
          value={htmlDraft}
          onChange={(e) => setHtmlDraft(e.target.value)}
          onBlur={() => emit(sanitizeHtml(htmlDraft))}
          spellCheck={false}
          className="w-full min-h-[300px] rounded-b-md px-4 py-3 font-mono text-xs focus:outline-none resize-y"
          style={{ color: "hsl(var(--foreground))", backgroundColor: "hsl(var(--background))", border: "none" }}
        />
      ) : (
        /* The page's own surface, whatever the admin theme: coloured words
           and headings look here exactly as they will publish. */
        <div className="admin-canvas rte-surface overflow-hidden rounded-b-md" style={{ backgroundColor: bgColor || "hsl(var(--card))", color: "hsl(var(--foreground))" }}>
          <EditorContent editor={editor} />
        </div>
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
