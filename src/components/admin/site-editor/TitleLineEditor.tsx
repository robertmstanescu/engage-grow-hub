import { useEditor, EditorContent } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import History from "@tiptap/extension-history";
import Dropcursor from "@tiptap/extension-dropcursor";
import Gapcursor from "@tiptap/extension-gapcursor";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
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
  const suppressUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      History,
      Dropcursor,
      Gapcursor,
      TextStyle,
      Color,
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      if (!suppressUpdate.current) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none px-3 py-2 font-display text-sm min-h-[36px]",
      },
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      suppressUpdate.current = true;
      editor.commands.setContent(value || "");
      suppressUpdate.current = false;
    }
  }, [value, editor]);

  const setColor = useCallback(() => {
    const color = window.prompt("Enter color (hex):", "#E5C54F");
    if (color) editor?.chain().focus().setColor(color).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
      <div
        className="flex items-center gap-0.5 px-2 py-1 border-b"
        style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--muted) / 0.2)" }}>
        {QUICK_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => editor.chain().focus().setColor(c.value).run()}
            title={c.label}
            className="w-4 h-4 rounded-full border border-black/10 hover:scale-110 transition-transform"
            style={{ backgroundColor: c.value }}
          />
        ))}
        <button
          type="button"
          onClick={setColor}
          title="Custom color"
          className="p-1 rounded hover:opacity-70"
          style={{ color: "hsl(var(--muted-foreground))" }}>
          <Palette size={12} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetColor().run()}
          title="Reset color"
          className="p-1 rounded hover:opacity-70"
          style={{ color: "hsl(var(--muted-foreground))" }}>
          <RotateCcw size={11} />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

export default TitleLineEditor;
