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
import { normalizeRichTextContainerFontSizes, normalizeRichTextHtml } from "@/services/richTextFontSize";
import { uploadEditorImage } from "@/services/mediaStorage";
import { runDbAction } from "@/services/db-helpers";
import { useBrandColors } from "@/hooks/useBrandSettings";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";

/**
 * ─────────────────────────────────────────────────────────────────────────
 * KEYSTROKE-LAG ARCHITECTURE (junior-dev orientation)
 * ─────────────────────────────────────────────────────────────────────────
 * Like TitleLineEditor, the user-visible text lives in the contentEditable
 * DOM node — never in React state. Typing is therefore instant: nothing
 * waits on the parent's re-render and the cursor is never bumped.
 *
 * Upstream propagation has TWO speeds:
 *
 *   • emitChange()           — immediate. Called when the user clicks a
 *                              toolbar button (bold, color, alignment,
 *                              link, image…) or blurs the editor. The
 *                              parent must learn about the formatting
 *                              change right away.
 *
 *   • emitChangeDebounced()  — 300 ms debounce. Called from `onInput`
 *                              (every keystroke). Bursts of typing fire
 *                              `onChange` exactly ONCE when the user
 *                              pauses. That collapses ~10 React tree
 *                              re-renders per word into a single one.
 *
 * The eventual `onChange` push triggers the SILENT auto-save effect in
 * `AdminDashboard` (see comments there). Auto-save writes ONLY to
 * `draft_content` / `draft_page_rows` — the live `content` columns are
 * untouched until the admin clicks "Publish".
 * ─────────────────────────────────────────────────────────────────────────
 */

const FONT_OPTIONS = [
  { label: "Inter", value: "Inter, sans-serif" },
  
  { label: "Architects Daughter", value: "'Architects Daughter', cursive" },
  { label: "Bricolage Grotesque", value: "'Bricolage Grotesque', sans-serif" },
];

/**
 * SIZE_OPTIONS — pixel-precise font sizes.
 *
 * We surface the EXACT px value (not "S/M/L") so designers can match
 * the rendered output 1:1.
 *
 * CSS Mapping (junior-dev note):
 *   1. User selects "36px" from the dropdown.
 *   2. `applyFontSize("36px")` runs `document.execCommand("fontSize", "7")`,
 *      which wraps the selection in `<font size="7">`.
 *   3. We immediately replace each `<font size="7">` with
 *      `<span style="font-size: 36px">…</span>`.
 *   4. DOMPurify (see `services/sanitize.ts`) is configured to keep the
 *      `style` attribute, so the inline size survives the save round-trip.
 *   5. On the live site, `<RowBody>` / `<RowTitle>` render the HTML inside
 *      a wrapper that does NOT force a font-size — so the inline 36px wins.
 */
const SIZE_OPTIONS = [
  { label: "12px", value: "12px" },
  { label: "14px", value: "14px" },
  { label: "16px", value: "16px" },
  { label: "18px", value: "18px" },
  { label: "20px", value: "20px" },
  { label: "24px", value: "24px" },
  { label: "30px", value: "30px" },
  { label: "36px", value: "36px" },
  { label: "48px", value: "48px" },
  { label: "60px", value: "60px" },
  { label: "72px", value: "72px" },
];

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /**
   * Background color (hex / hsl()) the live row will use. Passed in
   * so the EDITOR's writing surface matches the row — light text on a
   * white admin panel is invisible. We pass the row's "Style State"
   * (bg_color or first gradient stop) into the wrapper here, then mirror
   * it on the contentEditable div. If nothing is set we default to a
   * neutral dark surface so light text always remains readable.
   */
  bgColor?: string;
}

/**
 * Toolbar button — defined at MODULE level on purpose. When it lived
 * inside `RichTextEditor` every re-render created a brand-new component
 * type, so React unmounted and remounted the buttons mid-interaction:
 * the element under the pointer was replaced between `mousedown` and
 * `mouseup`, so the `click` never fired (or fired on the wrong button).
 * That was the "I press italic and something else happens" bug.
 */
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

const RichTextEditor = ({ content, onChange, placeholder, bgColor }: RichTextEditorProps) => {

  // The editor surface is transparent and inherits parent text color,
  // so the writing area always matches the rendered area it edits.
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const brandColors = useBrandColors();
  const [htmlMode, setHtmlMode] = useState(false);
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);
  // Track the active selection's font + size so the dropdowns reflect
  // what's currently in effect at the caret instead of always reading
  // "Font" / "Size" placeholders.
  const [activeFont, setActiveFont] = useState<string>("");
  const [activeSize, setActiveSize] = useState<string>("");

  /** Walk up from the caret/selection to find the first ancestor inside
   *  the editor whose computed style we can inspect. */
  const getCaretElement = (): HTMLElement | null => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    let node: Node | null = sel.getRangeAt(0).startContainer;
    if (node && node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    if (!editorRef.current || !node || !editorRef.current.contains(node)) return null;
    return node as HTMLElement;
  };

  /** Read the active font-family + font-size at the caret and update
   *  dropdown state. Called on selection change / click / keyup. */
  const syncToolbarState = useCallback(() => {
    const el = getCaretElement();
    if (!el) return;
    const cs = window.getComputedStyle(el);
    // Match font by checking which option is contained in the family stack
    const family = cs.fontFamily || "";
    const matchedFont = FONT_OPTIONS.find((f) => {
      const first = f.value.split(",")[0].trim().replace(/['"]/g, "").toLowerCase();
      return family.toLowerCase().includes(first);
    });
    setActiveFont(matchedFont?.value || "");
    // Round computed pixel size to nearest option
    const px = Math.round(parseFloat(cs.fontSize || "0"));
    if (px > 0) {
      const matchedSize = SIZE_OPTIONS.find((s) => parseInt(s.value, 10) === px);
      setActiveSize(matchedSize?.value || `${px}px`);
    } else {
      setActiveSize("");
    }
  }, []);


  const emitChange = useCallback(() => {
    if (editorRef.current) {
      normalizeRichTextContainerFontSizes(editorRef.current);
    }
    onChange(normalizeRichTextHtml(editorRef.current?.innerHTML || ""));
  }, [onChange]);

  // Debounced upstream push for raw typing — prevents per-keystroke
  // re-renders of the entire admin tree. 1000ms gives the admin time
  // to finish a sentence before the global cascade fires. See file
  // header for the FOCUS PROTECTION rationale.
  //
  // Font-size normalization happens HERE — not synchronously on every
  // keystroke in emitChangeOnInput — via normalizeRichTextHtml, which
  // safely operates on a detached <template> clone rather than the
  // live, focused contentEditable DOM. Replacing a <font> node in the
  // LIVE DOM mid-keystroke (e.g. via normalizeRichTextContainerFontSizes)
  // collapses the browser's selection, forcing the admin to click back
  // in after every character. So the live DOM is only touched when the
  // normalized markup actually differs AND the editor isn't currently
  // focused — mirroring the FOCUS PROTECTION guard in the useEffect
  // below — with the caret preserved across that write.
  const debouncedEmit = useDebouncedCallback(() => {
    const raw = editorRef.current?.innerHTML || "";
    const normalized = normalizeRichTextHtml(raw);
    if (editorRef.current && normalized !== raw && document.activeElement !== editorRef.current) {
      saveSelection();
      editorRef.current.innerHTML = normalized;
      restoreSelection();
    }
    onChange(normalized);
  }, 1000);

  const emitChangeOnInput = useCallback(() => {
    debouncedEmit();
  }, [debouncedEmit]);

  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current.contains(range.commonAncestorContainer)) {
      selectionRef.current = range.cloneRange();
    }
    syncToolbarState();
  }, [syncToolbarState]);

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
      // NOTE: we deliberately do NOT normalise font sizes here — bold /
      // italic / colour commands must never rewrite the sizes the admin
      // picked. Size normalisation happens only in `applyFontSize`.
      saveSelection();
      emitChange();
    },
    [emitChange, focusEditor, restoreSelection, saveSelection]
  );

  /**
   * applyFontSize — wraps the current selection in a span carrying the
   * exact pixel size.
   *
   * We no longer round-trip through `execCommand("fontSize", "7")`:
   * any `<font size="7">` that survived the swap was later mapped to
   * 48px by the shared normaliser, which is why every size change
   * ended up as 48. Wrapping the range ourselves is deterministic and
   * keeps the selection alive so the dropdown reflects reality.
   */
  const applyFontSize = useCallback(
    (fontSize: string) => {
      focusEditor();
      restoreSelection();

      const editor = editorRef.current;
      const sel = window.getSelection();
      if (!editor || !sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer)) return;

      if (range.collapsed) {
        // No selection — apply to the element the caret sits in so the
        // next typed characters inherit the chosen size.
        let node: Node | null = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
        if (node && node !== editor && editor.contains(node)) {
          (node as HTMLElement).style.fontSize = fontSize;
        }
      } else {
        const span = document.createElement("span");
        span.style.fontSize = fontSize;
        try {
          span.appendChild(range.extractContents());
        } catch {
          return;
        }
        // Strip competing sizes from descendants so the new size wins.
        span.querySelectorAll<HTMLElement>("[style*='font-size']").forEach((el) => {
          el.style.fontSize = "";
          if (!el.getAttribute("style")) el.removeAttribute("style");
        });
        span.querySelectorAll("font[size]").forEach((el) => el.removeAttribute("size"));
        range.insertNode(span);

        const next = document.createRange();
        next.selectNodeContents(span);
        sel.removeAllRanges();
        sel.addRange(next);
      }

      setActiveSize(fontSize);
      saveSelection();
      emitChange();
    },
    [emitChange, focusEditor, restoreSelection, saveSelection]
  );


  const handleImageUpload = useCallback(
    async (file: File) => {
      // Client-side guards before we burn an API call.
      if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
      if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }

      // runDbAction guarantees the user always sees either a success or
      // an error toast, even when the network blows up mid-upload.
      const result = await runDbAction({
        action: () => uploadEditorImage("rte", file),
        successMessage: "Image uploaded",
        errorMessage: "Failed to upload image",
      });
      if (result?.publicUrl) {
        runCommand("insertImage", result.publicUrl);
        // Tag the freshly-inserted <img> with baseline sizing so it can
        // never overflow the editor before an admin resizes it (see the
        // resize-handle overlay below), then persist that immediately —
        // runCommand()'s emitChange() already ran, but BEFORE these
        // styles existed on the node. CSS.escape guards the attribute
        // selector against a URL containing quote characters.
        requestAnimationFrame(() => {
          const img = editorRef.current?.querySelector<HTMLImageElement>(
            `img[src="${CSS.escape(result.publicUrl)}"]`,
          );
          if (img) {
            img.style.maxWidth = "100%";
            img.style.height = "auto";
            emitChange();
          }
        });
      }
    },
    [runCommand, emitChange]
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

  /**
   * ── Inline image resize + shape ──────────────────────────────────
   * WP-style: click an image to select it, drag its corner handle to
   * resize, pick a shape preset. The handles/toolbar below are rendered
   * as a SIBLING overlay (position: fixed, positioned via
   * getBoundingClientRect()) — never inside the contentEditable
   * subtree. Content here persists as a raw HTML string (see
   * emitChange/onChange above): any handle DOM living INSIDE editorRef
   * would get captured by that innerHTML read and corrupt every future
   * save. Any `<img>` is selectable, including ones saved before this
   * feature shipped — no marker attribute needed.
   */
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [overlayRect, setOverlayRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (htmlMode) setSelectedImage(null);
  }, [htmlMode]);

  useEffect(() => {
    if (!selectedImage) {
      setOverlayRect(null);
      return;
    }
    const update = () => {
      if (!selectedImage.isConnected) {
        setSelectedImage(null);
        return;
      }
      setOverlayRect(selectedImage.getBoundingClientRect());
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [selectedImage]);

  const handleEditorClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target instanceof HTMLImageElement) setSelectedImage(target);
    else setSelectedImage((prev) => (prev ? null : prev));
  }, []);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (!selectedImage) return;
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = selectedImage.getBoundingClientRect().width;
      const maxWidth = editorRef.current?.clientWidth || Infinity;

      const onMove = (moveEvent: MouseEvent) => {
        const next = Math.max(40, Math.min(startWidth + (moveEvent.clientX - startX), maxWidth));
        selectedImage.style.width = `${next}px`;
        setOverlayRect(selectedImage.getBoundingClientRect());
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        // One emitChange for the whole drag, not per mousemove frame —
        // matches the debounce discipline used everywhere else here.
        emitChange();
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [selectedImage, emitChange],
  );

  const applyImageShape = useCallback(
    (shape: "square" | "rounded" | "circle") => {
      if (!selectedImage) return;
      if (shape === "square") {
        selectedImage.style.borderRadius = "0";
        selectedImage.style.aspectRatio = "";
        selectedImage.style.objectFit = "";
      } else if (shape === "rounded") {
        selectedImage.style.borderRadius = "12px";
        selectedImage.style.aspectRatio = "";
        selectedImage.style.objectFit = "";
      } else {
        // Circle needs a forced 1:1 box + cover crop, or a non-square
        // source image renders as an ellipse instead of a circle.
        selectedImage.style.borderRadius = "50%";
        selectedImage.style.aspectRatio = "1";
        selectedImage.style.objectFit = "cover";
      }
      setOverlayRect(selectedImage.getBoundingClientRect());
      emitChange();
    },
    [selectedImage, emitChange],
  );

  useEffect(() => {
    if (htmlMode) return; // Don't sync when in HTML mode
    if (!editorRef.current) return;
    // FOCUS PROTECTION: while the user is typing in this editor, never
    // let an upstream prop change overwrite their in-flight keystrokes —
    // doing so would snap the cursor to the start of the line.
    if (document.activeElement === editorRef.current) return;
    const sanitized = sanitizeHtml(content || "");
    if (editorRef.current.innerHTML !== sanitized) {
      editorRef.current.innerHTML = sanitized;
    }
  }, [content, htmlMode]);

  // Listen for caret moves anywhere in the document to keep the font /
  // size dropdowns in sync with the active selection inside this editor.
  useEffect(() => {
    const handler = () => {
      if (!editorRef.current) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      if (!editorRef.current.contains(sel.getRangeAt(0).commonAncestorContainer)) return;
      syncToolbarState();
    };
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [syncToolbarState]);




  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: "hsl(var(--border))", backgroundColor: bgColor || "transparent" }}
    >
      <div
        className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b"
        style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--muted) / 0.3)" }}
      >
        <ToolbarButton onClick={() => runCommand("undo")} title="Undo"><Undo size={15} /></ToolbarButton>
        <ToolbarButton onClick={() => runCommand("redo")} title="Redo"><Redo size={15} /></ToolbarButton>

        <div className="w-px mx-1 h-5" style={{ backgroundColor: "hsl(var(--border))" }} />

        <select
          value={activeFont}
          onChange={(event) => {
            const v = event.target.value;
            if (v) {
              setActiveFont(v);
              runCommand("fontName", v);
            }
          }}
          className="font-body text-[10px] px-1.5 py-1 rounded border bg-transparent cursor-pointer"
          style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", maxWidth: "120px" }}
          onMouseDown={(event) => { saveSelection(); event.preventDefault(); }}
          title="Font Family"
        >
          <option value="">Font</option>
          {FONT_OPTIONS.map((font) => (
            <option key={font.value} value={font.value}>{font.label}</option>
          ))}
        </select>

        <select
          value={SIZE_OPTIONS.some((s) => s.value === activeSize) ? activeSize : ""}
          onChange={(event) => {
            const v = event.target.value;
            if (v) {
              setActiveSize(v);
              applyFontSize(v);
            }
          }}
          className="font-body text-[10px] px-1.5 py-1 rounded border bg-transparent cursor-pointer"
          style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", maxWidth: "85px" }}
          onMouseDown={(event) => { saveSelection(); event.preventDefault(); }}
          title="Font Size"
        >
          <option value="">{activeSize || "Size"}</option>
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
          onInput={emitChangeOnInput}
          onBlur={() => {
            saveSelection();
            // Flush any pending debounced keystrokes so blur is never lossy.
            debouncedEmit.cancel();
            emitChange();
          }}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onClick={handleEditorClick}
          // Transparent surface + inherited color so the editor
          // always blends with the rendered area, regardless of parent.
          style={{ color: "inherit", backgroundColor: "transparent" }}
        />
      )}

      {/* Image resize/shape overlay — a SIBLING of the contentEditable
          div, never a descendant (see the hook comment above for why).
          position: fixed + viewport coordinates from getBoundingClientRect
          keep it pinned to the selected <img> regardless of where in the
          DOM tree it renders. */}
      {selectedImage && overlayRect && (
        <div
          style={{
            position: "fixed",
            left: overlayRect.left,
            top: overlayRect.top,
            width: overlayRect.width,
            height: overlayRect.height,
            pointerEvents: "none",
            zIndex: 50,
            outline: "2px solid hsl(var(--accent))",
            outlineOffset: 2,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -34,
              left: 0,
              display: "flex",
              gap: 4,
              pointerEvents: "auto",
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              padding: 3,
            }}
          >
            <button
              type="button"
              title="Square"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyImageShape("square")}
              style={{ width: 18, height: 18, padding: 0, border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--muted-foreground))", cursor: "pointer" }}
            />
            <button
              type="button"
              title="Rounded"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyImageShape("rounded")}
              style={{ width: 18, height: 18, padding: 0, borderRadius: 5, border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--muted-foreground))", cursor: "pointer" }}
            />
            <button
              type="button"
              title="Circle"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyImageShape("circle")}
              style={{ width: 18, height: 18, padding: 0, borderRadius: "50%", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--muted-foreground))", cursor: "pointer" }}
            />
          </div>
          <div
            onMouseDown={handleResizeStart}
            title="Drag to resize"
            style={{
              position: "absolute",
              right: -6,
              bottom: -6,
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "hsl(var(--accent))",
              border: "2px solid white",
              cursor: "nwse-resize",
              pointerEvents: "auto",
            }}
          />
        </div>
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
