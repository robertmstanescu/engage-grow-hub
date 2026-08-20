/**
 * EditableText — static passthrough renderer.
 *
 * This used to also render a contentEditable "click to edit in place"
 * surface, gated on a global edit/select mode from InlineEditContext.
 * That context was never wired to any UI control that could turn it
 * on (no toggle anywhere called its setters), so the editable branch
 * was permanently dead code — removed along with InlineEditContext.tsx.
 * In-place canvas editing today goes through CanvasEditable
 * (src/features/admin/builder/CanvasEditable.tsx) instead.
 *
 * `sectionKey` / `fieldPath` / `html` are kept in the prop signature
 * (unused) purely so the existing call sites across the row components
 * don't need to change.
 */

interface EditableTextProps {
  /** @deprecated unused — kept for call-site compatibility. */
  sectionKey?: string;
  /** @deprecated unused — kept for call-site compatibility. */
  fieldPath?: string;
  /** @deprecated unused — kept for call-site compatibility. */
  html?: boolean;
  /** The element to render (default: span) */
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  dangerouslySetInnerHTML?: { __html: string };
}

const EditableText = ({
  sectionKey: _sectionKey,
  fieldPath: _fieldPath,
  html: _html,
  as: Tag = "span",
  children,
  className = "",
  style,
  dangerouslySetInnerHTML,
  ...rest
}: EditableTextProps & Record<string, any>) => {
  const El = Tag as any;
  if (dangerouslySetInnerHTML) {
    return <El className={className} style={style} dangerouslySetInnerHTML={dangerouslySetInnerHTML} {...rest} />;
  }
  return <El style={style} className={className} {...rest}>{children}</El>;
};

export default EditableText;
