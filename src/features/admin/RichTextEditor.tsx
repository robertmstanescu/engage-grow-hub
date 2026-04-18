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
  Undo,
  Redo,
  RemoveFormatting,
  Code,
  LetterText,
} from "lucide-react";
import { toast } from "sonner";
import { sanitizeHtml } from "@/services/sanitize";
import { uploadEditorImage } from "@/services/mediaStorage";
import { runDbAction } from "@/services/db-helpers";
import { useBrandColors } from "@/hooks/useBrandSettings";

const FONT_OPTIONS = [
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Unbounded", value: "Unbounded, sans-serif" },
  { label: "Architects Daughter", value: "'Architects Daughter', cursive" },
  { label: "Bricolage Grotesque", value: "'Bricolage Grotesque', sans-serif" },
];

const SIZE_OPTIONS = [
  { label: "XS", value: "11px" },
  { label: "S", value: "13px" },
  { label: "M", value: "15px" },
  { label: "L", value: "18px" },
  { label: "XL", value: "22px" },
  { label: "2XL", value: "28px" },
  { label: "3XL", value: "36px" },
];

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  bgColor?: string;
}

const RichTextEditor = ({ content, onChange, placeholder, bgColor }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const brandColors = useBrandColors();
  const [htmlMode, setHtmlMode] = useState(false);
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);

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

  const focusEditor = useCallback(() => {
    editorRef.current?.focus();
  }, []);

  const runCommand = useCallback(
    (command: string, value?: string) => {
      focusEditor();
      restoreSelection();
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand(command, false, value);
      saveSelection();
      emitChange();
    },
    [emitChange, focusEditor, restoreSelection, saveSelection]
  );

  const applyFontSize = useCallback(
    (fontSize: string) => {
      focusEditor();
      restoreSelection();
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("fontSize", false, "7");
      editorRef.current
        ?.querySelectorAll('font[size="7"]')
        .forEach((node) => {
          const span = document.createElement("span");
          span.style.fontSize = fontSize;
          span.innerHTML = node.innerHTML;
          node.replaceWith(span);
        });
      saveSelection();
      emitChange();
    },
    [emitChange, focusEditor, restoreSelection, saveSelection]
  );

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
      if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("editor-images").upload(path, file);
      if (error) { toast.error("Failed to upload image"); return; }
      const { data: { publicUrl } } = supabase.storage.from("editor-images").getPublicUrl(path);
      runCommand("insertImage", publicUrl);
      toast.success("Image uploaded");
    },
    [runCommand]
  );

  const addLink = useCallback(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString() || "";
    const url = window.prompt("Enter URL:", "https://");
    if (url === null) return;
    if (!url) { runCommand("unlink"); return; }
    if (!selectedText) {
      runCommand("insertHTML", `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
      return;
    }
    runCommand("createLink", url);
  }, [runCommand]);

  const setTextColor = useCallback(() => {
    const color = window.prompt("Enter color (hex, e.g. #4D1B5E):", "#000000");
    if (color) runCommand("foreColor", color);
  }, [runCommand]);

  const setHighlightColor = useCallback(() => {
    const color = window.prompt("Enter highlight color (hex):", "#E5C54F");
    if (!color) return;
    focusEditor();
    restoreSelection();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("hiliteColor", false, color) || document.execCommand("backColor", false, color);
    saveSelection();
    emitChange();
  }, [emitChange, focusEditor, restoreSelection, saveSelection]);

  /* ── Toggle blockquote (press again to remove) ── */
  const toggleBlockquote = useCallback(() => {
    focusEditor();
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    let node: Node | null = sel.anchorNode;
    while (node && node !== editorRef.current) {
      if (node.nodeName === "BLOCKQUOTE") {
        // Unwrap: replace blockquote with its children
        const parent = node.parentNode;
        if (parent) {
          while (node.firstChild) parent.insertBefore(node.firstChild, node);
          parent.removeChild(node);
        }
        emitChange();
        return;
      }
      node = node.parentNode;
    }
    // Not in a blockquote — apply one
    document.execCommand("formatBlock", false, "blockquote");
    emitChange();
  }, [emitChange, focusEditor, restoreSelection]);

  /* ── Drop cap / Initial letter ── */
  const applyDropCap = useCallback(() => {
    focusEditor();
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    // Find the paragraph element
    let block: Node | null = sel.anchorNode;
    while (block && block !== editorRef.current && !["P", "DIV"].includes((block as HTMLElement).nodeName)) {
      block = block.parentNode;
    }
    if (!block || block === editorRef.current) return;

    const el = block as HTMLElement;
    // Check if first child already has drop-cap class — toggle off
    const firstChild = el.firstChild;
    if (firstChild && firstChild.nodeType === 1 && (firstChild as HTMLElement).classList?.contains("drop-cap")) {
      // Unwrap
      const span = firstChild as HTMLElement;
      const text = document.createTextNode(span.textContent || "");
      el.replaceChild(text, span);
      emitChange();
      return;
    }

    // Get the text content and wrap the first letter
    const textContent = el.textContent || "";
    if (!textContent.trim()) return;

    // Find first text node
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const firstTextNode = walker.nextNode();
    if (!firstTextNode || !firstTextNode.textContent) return;

    const text = firstTextNode.textContent;
    const firstLetter = text.charAt(0);
    const rest = text.slice(1);

    const span = document.createElement("span");
    span.className = "drop-cap";
    span.textContent = firstLetter;

    firstTextNode.textContent = rest;
    firstTextNode.parentNode?.insertBefore(span, firstTextNode);
    emitChange();
  }, [emitChange, focusEditor, restoreSelection]);

  /* ── HTML mode toggle ── */
  const toggleHtmlMode = useCallback(() => {
    if (htmlMode) {
      // Switching from HTML → visual: push textarea value into editor
      const newHtml = htmlTextareaRef.current?.value || "";
      onChange(newHtml);
    }
    setHtmlMode((prev) => !prev);
  }, [htmlMode, onChange]);

  useEffect(() => {
    if (htmlMode) return; // Don't sync when in HTML mode
    if (!editorRef.current) return;
    const sanitized = sanitizeHtml(content || "");
    if (editorRef.current.innerHTML !== sanitized) {
      editorRef.current.innerHTML = sanitized;
    }
  }, [content, htmlMode]);

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

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}
    >
      <div
        className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b"
        style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--muted) / 0.3)" }}
      >
        <ToolbarButton onClick={() => runCommand("undo")} title="Undo"><Undo size={15} /></ToolbarButton>
        <ToolbarButton onClick={() => runCommand("redo")} title="Redo"><Redo size={15} /></ToolbarButton>

        <div className="w-px mx-1 h-5" style={{ backgroundColor: "hsl(var(--border))" }} />

        <select
          defaultValue=""
          onChange={(event) => {
            if (event.target.value) runCommand("fontName", event.target.value);
            event.target.value = "";
          }}
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
          defaultValue=""
          onChange={(event) => {
            if (event.target.value) applyFontSize(event.target.value);
            event.target.value = "";
          }}
          className="font-body text-[10px] px-1.5 py-1 rounded border bg-transparent cursor-pointer"
          style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", maxWidth: "65px" }}
          title="Font Size"
        >
          <option value="">Size</option>
          {SIZE_OPTIONS.map((size) => (
            <option key={size.value} value={size.value}>{size.label}</option>
          ))}
        </select>

        <div className="w-px mx-1 h-5" style={{ backgroundColor: "hsl(var(--border))" }} />

        <ToolbarButton onClick={() => runCommand("bold")} title="Bold"><Bold size={15} /></ToolbarButton>
        <ToolbarButton onClick={() => runCommand("italic")} title="Italic"><Italic size={15} /></ToolbarButton>
        <ToolbarButton onClick={() => runCommand("underline")} title="Underline"><UnderlineIcon size={15} /></ToolbarButton>
        <ToolbarButton onClick={() => runCommand("strikeThrough")} title="Strikethrough"><Strikethrough size={15} /></ToolbarButton>

        <div className="w-px mx-1 h-5" style={{ backgroundColor: "hsl(var(--border))" }} />

        {brandColors.slice(0, 8).map((c) => (
          <button key={c.id} type="button" title={c.name}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runCommand("foreColor", c.hex)}
            className="w-4 h-4 rounded-full border hover:scale-110 transition-transform"
            style={{ backgroundColor: c.hex, borderColor: "hsl(var(--border))" }} />
        ))}
        <ToolbarButton onClick={setTextColor} title="Custom Text Color"><Palette size={15} /></ToolbarButton>
        <ToolbarButton onClick={setHighlightColor} title="Highlight"><Highlighter size={15} /></ToolbarButton>

        <div className="w-px mx-1 h-5" style={{ backgroundColor: "hsl(var(--border))" }} />

        <ToolbarButton onClick={() => runCommand("justifyLeft")} title="Align Left"><AlignLeft size={15} /></ToolbarButton>
        <ToolbarButton onClick={() => runCommand("justifyCenter")} title="Align Center"><AlignCenter size={15} /></ToolbarButton>
        <ToolbarButton onClick={() => runCommand("justifyRight")} title="Align Right"><AlignRight size={15} /></ToolbarButton>

        <div className="w-px mx-1 h-5" style={{ backgroundColor: "hsl(var(--border))" }} />

        <ToolbarButton onClick={() => runCommand("insertUnorderedList")} title="Bullet List"><List size={15} /></ToolbarButton>
        <ToolbarButton onClick={() => runCommand("insertOrderedList")} title="Numbered List"><ListOrdered size={15} /></ToolbarButton>
        <ToolbarButton onClick={toggleBlockquote} title="Blockquote (toggle)"><Quote size={15} /></ToolbarButton>

        <div className="w-px mx-1 h-5" style={{ backgroundColor: "hsl(var(--border))" }} />

        <ToolbarButton onClick={applyDropCap} title="Drop Cap / Initial Letter"><LetterText size={15} /></ToolbarButton>
        <ToolbarButton onClick={addLink} title="Add Link"><LinkIcon size={15} /></ToolbarButton>
        <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Upload Image"><ImageIcon size={15} /></ToolbarButton>

        <div className="w-px mx-1 h-5" style={{ backgroundColor: "hsl(var(--border))" }} />

        <ToolbarButton onClick={() => runCommand("removeFormat")} title="Remove Formatting"><RemoveFormatting size={15} /></ToolbarButton>
        <ToolbarButton onClick={toggleHtmlMode} title="HTML Source" active={htmlMode}><Code size={15} /></ToolbarButton>
      </div>

      {htmlMode ? (
        <textarea
          ref={htmlTextareaRef}
          defaultValue={content || ""}
          className="w-full min-h-[300px] px-4 py-3 font-mono text-xs focus:outline-none resize-y"
          style={{
            color: "hsl(var(--foreground))",
            backgroundColor: "hsl(var(--background))",
            border: "none",
          }}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          data-placeholder={placeholder || "Start writing..."}
          className="prose prose-sm max-w-none min-h-[300px] px-4 py-3 focus:outline-none"
          onInput={emitChange}
          onBlur={() => { saveSelection(); emitChange(); }}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          style={{ color: bgColor ? "#F4F0EC" : "hsl(var(--foreground))", backgroundColor: bgColor || undefined }}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleImageUpload(file);
          event.target.value = "";
        }}
      />
    </div>
  );
};

export default RichTextEditor;
