import type React from "react";
import { useBuilder } from "@/features/admin/builder/BuilderContext";
import CanvasEditable from "@/features/admin/builder/CanvasEditable";
import { fieldPathToNodePath } from "@/features/admin/builder/fieldPath";
import { useCurrentWidgetId } from "@/features/site/rows/PrimaryHeadingContext";

interface EditableTextProps {
  /** Kept for call-site compatibility; unused. */
  sectionKey?: string;
  /** `rows.<i>.content.<field>` or `rows.<i>.content.<list>.<n>.<field>` — the builder path is derived from it. */
  fieldPath?: string;
  /** The value is HTML (rich text). */
  html?: boolean;
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  dangerouslySetInnerHTML?: { __html: string };
}

/**
 * EditableText — text on the canvas you can double-click and type into.
 *
 * On the public site this is a plain element. Inside the builder it is
 * a CanvasEditable at the path derived from `fieldPath` for the widget
 * being rendered: double-click starts editing, Enter or blur commits,
 * Escape reverts. Rows that already used EditableText (Boxed, Grid,
 * Image + Text, Profile, Service, Text) gain inline editing with no
 * changes of their own.
 */
const EditableText = ({
  sectionKey: _sectionKey,
  fieldPath,
  html = false,
  as: Tag = "span",
  children,
  className = "",
  style,
  dangerouslySetInnerHTML,
  ...rest
}: EditableTextProps & Record<string, unknown>) => {
  const { enabled, setEditingPath } = useBuilder();
  const widgetId = useCurrentWidgetId();
  const path = enabled && widgetId ? fieldPathToNodePath(widgetId, fieldPath) : null;

  const El = Tag as React.ElementType;
  if (!path) {
    if (dangerouslySetInnerHTML) return <El className={className} style={style} dangerouslySetInnerHTML={dangerouslySetInnerHTML} {...rest} />;
    return <El style={style} className={className} {...rest}>{children}</El>;
  }

  const value = dangerouslySetInnerHTML ? dangerouslySetInnerHTML.__html : typeof children === "string" ? children : "";
  const start = (e: React.MouseEvent<HTMLElement>) => { e.preventDefault(); e.stopPropagation(); setEditingPath(path); };
  return (
    <CanvasEditable
      path={path}
      value={value}
      html={html || !!dangerouslySetInnerHTML}
      as={Tag}
      className={className}
      style={style}
      onDoubleClick={start}
    >
      {dangerouslySetInnerHTML || typeof children === "string" ? undefined : children}
    </CanvasEditable>
  );
};

export default EditableText;
