import { useRef, useCallback, KeyboardEvent } from "react";
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
  dangerouslySetInnerHTML?: { __html: string };
}

const EditableText = ({
  sectionKey,
  fieldPath,
  html = false,
  as: Tag = "span",
  children,
  className = "text-secondary",
  style,
  dangerouslySetInnerHTML,
  ...rest
}: EditableTextProps & Record<string, any>) => {
  const { editMode, selectMode, selectedElement, setSelectedElement, saveField } = useInlineEdit();
  const elementId = `${sectionKey}.${fieldPath}`;
  const ref = useRef<HTMLElement>(null);
  const originalRef = useRef<string>("");

  const handleFocus = useCallback(() => {
    if (ref.current) {
      originalRef.current = html ? ref.current.innerHTML : (ref.current.textContent || "");
    }
  }, [html]);

  const handleBlur = useCallback(() => {
    if (!ref.current) return;
    const newValue = html ? ref.current.innerHTML : (ref.current.textContent || "");
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

  if (!editMode && !selectMode) {
    const El = Tag as any;
    if (dangerouslySetInnerHTML) {
      return <El className={className} style={style} dangerouslySetInnerHTML={dangerouslySetInnerHTML} {...rest} />;
    }
    return <El className={className} style={style} {...rest}>{children}</El>;
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
      transition: "outline 0.15s ease",
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
    minHeight: "1em",
  };

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
    ...rest,
  };

  if (dangerouslySetInnerHTML) {
    props.dangerouslySetInnerHTML = dangerouslySetInnerHTML;
  } else {
    props.children = children;
  }

  return <El {...props} />;
};

export default EditableText;
