import { useEffect, useRef, useCallback, KeyboardEvent } from "react";
import { useInlineEdit } from "./InlineEditContext";

interface EditableTextProps {
  /** The site_content section_key (e.g. "hero", "page_rows") */
  sectionKey: string;
  /** Dot-notation path to the field (e.g. "label", "rows.0.content.title") */
  fieldPath: string;
  /** If true, saves innerHTML instead of textContent */
  html?: boolean;
  /** The element to render (default: span) */
  as?: keyof JSX.IntrinsicElements;
  /** All other props passed to the underlying element */
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  dangerouslySetInnerHTML?: {__html: string;};
}

const EditableText = ({
  sectionKey,
  fieldPath,
  html = false,
  as: Tag = "span",
  children,
  className = "",
  style,
  dangerouslySetInnerHTML,
  ...rest
}: EditableTextProps & Record<string, any>) => {
  const { editMode, selectMode, selectedElement, setSelectedElement, saveField } = useInlineEdit();
  const elementId = `${sectionKey}.${fieldPath}`;
  const ref = useRef<HTMLElement>(null);
  const originalRef = useRef<string>("");

  // Canonical string value for the contentEditable surface. Every
  // current caller passes content as either an HTML string
  // (`dangerouslySetInnerHTML`) or plain-text `children` — never both.
  const domValue = dangerouslySetInnerHTML
    ? dangerouslySetInnerHTML.__html
    : typeof children === "string"
      ? children
      : children == null
        ? ""
        : String(children);

  const handleFocus = useCallback(() => {
    if (ref.current) {
      originalRef.current = html ? ref.current.innerHTML : ref.current.textContent || "";
    }
  }, [html]);

  const handleBlur = useCallback(() => {
    if (!ref.current) return;
    const newValue = html ? ref.current.innerHTML : ref.current.textContent || "";
    if (newValue !== originalRef.current) {
      saveField(sectionKey, fieldPath, newValue);
    }
  }, [sectionKey, fieldPath, html, saveField]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Enter" && !html) {
      e.preventDefault();
      ref.current?.blur();
    }
    if (e.key === "Escape") {
      if (ref.current) {
        if (html) {
          ref.current.innerHTML = originalRef.current;
        } else {
          ref.current.textContent = originalRef.current;
        }
      }
      ref.current?.blur();
    }
  }, [html]);

  // FOCUS PROTECTION: while this field is focused (actively being
  // edited), never let an upstream content change overwrite the
  // in-flight edit — that would snap the cursor to the start and could
  // drop keystrokes. Mirrors the pattern in RichTextEditor.tsx /
  // TitleLineEditor.tsx. `ref.current` is only non-null while the
  // contentEditable branch below is mounted, so this is a no-op
  // outside edit/select mode.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (html) {
      if (el.innerHTML !== domValue) el.innerHTML = domValue;
    } else if (el.textContent !== domValue) {
      el.textContent = domValue;
    }
  }, [domValue, html, editMode, selectMode]);

  if (!editMode && !selectMode) {
    const El = Tag as any;
    if (dangerouslySetInnerHTML) {
      return <El className={className} style={style} dangerouslySetInnerHTML={dangerouslySetInnerHTML} {...rest} />;
    }
    return <El style={style} className={className} {...rest}>{children}</El>;
  }

  // Select mode: highlight on click
  if (selectMode && !editMode) {
    const isSelected = selectedElement === elementId;
    const selectStyle: React.CSSProperties = {
      ...style,
      cursor: "pointer",
      outline: isSelected ? "2px solid hsl(var(--primary))" : undefined,
      outlineOffset: isSelected ? "3px" : undefined,
      borderRadius: "2px",
      transition: "outline 0.15s ease"
    };
    const El = Tag as any;
    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedElement(isSelected ? null : elementId);
    };
    if (dangerouslySetInnerHTML) {
      return <El className={className} style={selectStyle} onClick={handleClick} dangerouslySetInnerHTML={dangerouslySetInnerHTML} {...rest} />;
    }
    return <El className={className} style={selectStyle} onClick={handleClick} {...rest}>{children}</El>;
  }

  // Edit mode: make contentEditable
  const editStyle: React.CSSProperties = {
    ...style,
    outline: "2px dashed hsl(var(--accent) / 0.5)",
    outlineOffset: "2px",
    cursor: "text",
    borderRadius: "2px",
    minWidth: "20px",
    minHeight: "1em"
  };

  // Content is seeded/synced exclusively by the FOCUS-PROTECTED effect
  // above — we deliberately never pass children/dangerouslySetInnerHTML
  // here. Doing so would hand this node back to React's diffing on
  // every re-render (e.g. the debounced/refetch-triggered prop updates
  // below) and collapse the caret mid-edit — the exact bug fixed in
  // RichTextEditor.tsx's emitChangeOnInput.
  const El = Tag as any;
  const props: any = {
    ref,
    className,
    style: editStyle,
    contentEditable: true,
    suppressContentEditableWarning: true,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
    ...rest
  };

  return <El {...props} />;
};

export default EditableText;