import { useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Heading1, Heading2, Heading3,
  Link as LinkIcon, Image as ImageIcon, AlignLeft, AlignCenter,
  AlignRight, Palette, Highlighter, Undo, Redo, Type,
} from "lucide-react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const RichTextEditor = ({ content, onChange, placeholder }: RichTextEditorProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      TextStyle,
      Color,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[300px] px-4 py-3",
      },
    },
  });

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from("editor-images").upload(path, file);
    if (error) {
      toast.error("Failed to upload image");
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("editor-images").getPublicUrl(path);
    editor?.chain().focus().setImage({ src: publicUrl }).run();
    toast.success("Image uploaded");
  }, [editor]);

  const addLink = useCallback(() => {
    const previousUrl = editor?.getAttributes("link").href || "";
    const url = window.prompt("Enter URL:", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const setTextColor = useCallback(() => {
    const color = window.prompt("Enter color (hex, e.g. #4D1B5E):", "#000000");
    if (color) editor?.chain().focus().setColor(color).run();
  }, [editor]);

  const setHighlightColor = useCallback(() => {
    const color = window.prompt("Enter highlight color (hex):", "#E5C54F");
    if (color) editor?.chain().focus().toggleHighlight({ color }).run();
  }, [editor]);

  if (!editor) return null;

  const ToolbarButton = ({
    onClick,
    isActive = false,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-1.5 rounded transition-colors"
      style={{
        backgroundColor: isActive ? "hsl(var(--primary) / 0.15)" : "transparent",
        color: isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
      }}>
      {children}
    </button>
  );

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}>
      {/* Toolbar */}
      <div
        className="flex flex-wrap gap-0.5 px-2 py-1.5 border-b"
        style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--muted) / 0.3)" }}>
        {/* Undo / Redo */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo size={15} />
        </ToolbarButton>

        <div className="w-px mx-1" style={{ backgroundColor: "hsl(var(--border))" }} />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setParagraph().run()}
          isActive={editor.isActive("paragraph") && !editor.isActive("heading")}
          title="Paragraph">
          <Type size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive("heading", { level: 1 })}
          title="Heading 1">
          <Heading1 size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          title="Heading 2">
          <Heading2 size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
          title="Heading 3">
          <Heading3 size={15} />
        </ToolbarButton>

        <div className="w-px mx-1" style={{ backgroundColor: "hsl(var(--border))" }} />

        {/* Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Bold">
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Italic">
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          title="Underline">
          <UnderlineIcon size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="Strikethrough">
          <Strikethrough size={15} />
        </ToolbarButton>

        <div className="w-px mx-1" style={{ backgroundColor: "hsl(var(--border))" }} />

        {/* Colors */}
        <ToolbarButton onClick={setTextColor} title="Text Color">
          <Palette size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={setHighlightColor}
          isActive={editor.isActive("highlight")}
          title="Highlight">
          <Highlighter size={15} />
        </ToolbarButton>

        <div className="w-px mx-1" style={{ backgroundColor: "hsl(var(--border))" }} />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          isActive={editor.isActive({ textAlign: "left" })}
          title="Align Left">
          <AlignLeft size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          isActive={editor.isActive({ textAlign: "center" })}
          title="Align Center">
          <AlignCenter size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          isActive={editor.isActive({ textAlign: "right" })}
          title="Align Right">
          <AlignRight size={15} />
        </ToolbarButton>

        <div className="w-px mx-1" style={{ backgroundColor: "hsl(var(--border))" }} />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Bullet List">
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Numbered List">
          <ListOrdered size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="Blockquote">
          <Quote size={15} />
        </ToolbarButton>

        <div className="w-px mx-1" style={{ backgroundColor: "hsl(var(--border))" }} />

        {/* Link & Image */}
        <ToolbarButton
          onClick={addLink}
          isActive={editor.isActive("link")}
          title="Add Link">
          <LinkIcon size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          title="Upload Image">
          <ImageIcon size={15} />
        </ToolbarButton>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
};

export default RichTextEditor;
