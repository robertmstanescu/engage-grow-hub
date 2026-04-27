import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT, getRowColumns, multiColGridStyle } from "@/lib/constants/rowDefaults";
import { sanitizeHtml } from "@/services/sanitize";
import EditableText from "@/features/admin/EditableText";
import SubscribeWidget from "@/features/site/SubscribeWidget";
import type { Alignment, VAlign } from "./PageRows";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import { useAutoFitText } from "@/hooks/useAutoFitText";
import { RowEyebrow, RowTitle, RowSubtitle, RowBody, RowSection } from "./typography";
// EPIC 1 / US 1.1 — atomic-node selection on text-row fields.
import SelectableWrapper from "@/features/admin/builder/SelectableWrapper";
// EPIC 1 / US 1.4 — direct-on-canvas text editing (double-click → contentEditable).
import CanvasEditable from "@/features/admin/builder/CanvasEditable";

const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

const TextRow = ({ row, rowIndex, align = "left", vAlign = "middle" }: { row: PageRow; rowIndex?: number; align?: Alignment; vAlign?: VAlign }) => {
  const { contents, widths, isMultiCol } = getRowColumns(row);
  const l = { ...DEFAULT_ROW_LAYOUT, ...row.layout };
  const maxW = l.fullWidth ? "max-w-none" : "max-w-[800px]";
  const isLight = row.bg_color && (row.bg_color.includes("94%") || row.bg_color.includes("100%") || row.bg_color.includes("white") || row.bg_color.includes("#F") || row.bg_color.includes("#f"));

  // ════════════════════════════════════════════════════════════════════
  // JUNIOR-DEV NOTE: aligning a CONSTRAINED-WIDTH container
  // ════════════════════════════════════════════════════════════════════
  // For a block-level <div> with a `max-width`, margins control where
  // the box sits inside its parent:
  //   • mx-auto  → equal margins on both sides → CENTERED
  //   • ml-auto  → all extra space goes to the LEFT  → RIGHT-aligned
  //   • mr-auto  → all extra space goes to the RIGHT → LEFT-aligned
  // For `ml-auto` / `mr-auto` to actually shift the box, the PARENT
  // must be wider than the box (we ensure this with `w-full` on the
  // wrapper plus `max-w-[800px]` on the column itself).
  const contentAlign = align === "center" ? "text-center"
    : align === "right" ? "text-right"
    : "text-left";
  const containerPos = align === "center" ? "mx-auto"
    : align === "right" ? "ml-auto"
    : "mr-auto";

  const { ref, isVisible } = useScrollReveal();
  const autoFitRef = useAutoFitText();

  const renderColumnContent = (c: Record<string, any>, colIndex: number) => {
    const prefix = rowIndex !== undefined
      ? (colIndex === 0 ? `rows.${rowIndex}.content` : `rows.${rowIndex}.columns_data.${colIndex - 1}`)
      : "";
    const titleLines: string[] = (c.title_lines || []).map((li: any) =>
      typeof li === "string" ? (li.startsWith("<") ? li : `<p>${li}</p>`) : `<p>${li}</p>`
    );
    const noteColor = c.color_note || (isLight ? "hsl(var(--light-fg) / 0.5)" : "hsl(var(--foreground) / 0.5)");

    // Path base for atomic-node selection. Multi-column rows include the
    // column index so each column's eyebrow/title/etc are distinct nodes.
    const basePath: string[] = ["row", row.id, "widget", row.id, "col", String(colIndex)];

    return (
      <div key={colIndex} className={isMultiCol ? "" : `${maxW} ${containerPos} ${contentAlign}`}>
        {c.eyebrow && (
          <SelectableWrapper path={[...basePath, "eyebrow"]} label="Eyebrow" variant="atom" inline>
            <RowEyebrow color={c.color_eyebrow || (isLight ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.5)")} style={revealStyle(isVisible, -0.5)}>
              <CanvasEditable path={[...basePath, "eyebrow"]} value={c.eyebrow} as="span">
                <EditableText sectionKey="page_rows" fieldPath={`${prefix}.eyebrow`} as="span">{c.eyebrow}</EditableText>
              </CanvasEditable>
            </RowEyebrow>
          </SelectableWrapper>
        )}

        {titleLines.length > 0 && (
          <SelectableWrapper path={[...basePath, "title"]} label="Title" variant="atom" inline>
            <RowTitle icon={c.icon} color={isLight ? "hsl(var(--primary))" : "hsl(var(--foreground))"} style={revealStyle(isVisible, 0)}>
              <CanvasEditable
                path={[...basePath, "title"]}
                /* When editing, the user types the title as plain text with
                   newlines splitting lines. The provider's writeRowsAtPath
                   re-splits on \n to populate `title_lines`. */
                value={(c.title_lines || []).map((li: any) => typeof li === "string" ? li.replace(/<[^>]+>/g, "") : "").join("\n")}
                as="span"
              >
                {titleLines.map((line, i) => (<span key={i}>{i > 0 && <br />}<span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} /></span>))}
              </CanvasEditable>
            </RowTitle>
          </SelectableWrapper>
        )}

        {c.subtitle && (
          <SelectableWrapper path={[...basePath, "subtitle"]} label="Subtitle" variant="atom" inline>
            <RowSubtitle color={c.subtitle_color || "inherit"} style={revealStyle(isVisible, 1)}>
              <CanvasEditable path={[...basePath, "subtitle"]} value={c.subtitle} as="span">
                <EditableText sectionKey="page_rows" fieldPath={`${prefix}.subtitle`} as="span">{c.subtitle}</EditableText>
              </CanvasEditable>
            </RowSubtitle>
          </SelectableWrapper>
        )}

        {c.body && (
          <SelectableWrapper path={[...basePath, "body"]} label="Body" variant="atom">
            <div style={revealStyle(isVisible, 2)}>
              <CanvasEditable
                path={[...basePath, "body"]}
                value={c.body}
                html
                as="div"
                className={`font-body-heading font-medium leading-[1.6] ${isMultiCol ? "" : "max-w-[700px]"} mt-rhythm-tight [&_p]:mb-[5px] [&_p]:mt-[5px] ${!isMultiCol && align === "right" ? "ml-auto" : !isMultiCol && align === "center" ? "mx-auto" : ""}`}
                style={{ color: c.color_body || (isLight ? "hsl(var(--light-fg) / 0.75)" : "hsl(var(--foreground) / 0.7)"), fontSize: "clamp(0.9rem, 1.5vw, 1.05rem)" }}
              >
                <EditableText sectionKey="page_rows" fieldPath={`${prefix}.body`} html as="div"
                  data-rte-fit=""
                  className={`font-body-heading font-medium leading-[1.6] ${isMultiCol ? "" : "max-w-[700px]"} mt-rhythm-tight [&_p]:mb-[5px] [&_p]:mt-[5px] ${!isMultiCol && align === "right" ? "ml-auto" : !isMultiCol && align === "center" ? "mx-auto" : ""}`}
                  style={{ color: c.color_body || (isLight ? "hsl(var(--light-fg) / 0.75)" : "hsl(var(--foreground) / 0.7)"), fontSize: "clamp(0.9rem, 1.5vw, 1.05rem)" }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.body) }} />
              </CanvasEditable>
            </div>
          </SelectableWrapper>
        )}

        {c.note && (
          <div className="mt-rhythm-base pt-3" style={{ ...revealStyle(isVisible, 2.5), borderTop: "1px solid hsl(var(--foreground) / 0.1)" }}>
            <p className="font-body text-xs italic leading-[1.6]" style={{ color: noteColor }}>{c.note}</p>
          </div>
        )}

        {c.cta_url && c.cta_label && (
          <div className="mt-rhythm-base" style={revealStyle(isVisible, 3)}>
            <a href={c.cta_url} target={c.cta_url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
              className="btn-glass interactive font-display text-[10px] uppercase tracking-[0.1em] font-bold px-6 py-3 rounded-full inline-block"
              style={{ backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--primary-foreground))" }}>
              {c.cta_label}
            </a>
          </div>
        )}

        {c.show_subscribe && <div style={revealStyle(isVisible, 3)}><SubscribeWidget className="mt-rhythm-loose" align={align} /></div>}
      </div>
    );
  };

  return (
    <RowSection
      row={row}
      vAlign={vAlign}
      grain={false}
      innerRef={(el) => { autoFitRef.current = el; }}
    >
      {/*
        Wrapper is full-width so the constrained inner column can use
        ml-auto / mr-auto to shift left or right. Without `w-full`,
        the wrapper would shrink-to-fit and ml-auto would be a no-op.
      */}
      <div ref={ref} className={`relative z-10 px-6 w-full ${isMultiCol ? `${l.fullWidth ? "" : "max-w-[1200px]"} ${containerPos}` : ""} ${contentAlign}`}>
        {isMultiCol ? (
          <div style={multiColGridStyle(widths)} className="items-start">
            {contents.map((c, i) => renderColumnContent(c, i))}
          </div>
        ) : (
          renderColumnContent(contents[0], 0)
        )}
      </div>
    </RowSection>
  );
};

export default TextRow;
