import { memo } from "react";
import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/lib/constants/rowDefaults";
import { sanitizeHtml } from "@/services/sanitize";
import EditableText from "@/features/admin/EditableText";
import SubscribeWidget from "@/features/site/SubscribeWidget";
import type { Alignment, VAlign } from "./PageRows";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import { useAutoFitText } from "@/hooks/useAutoFitText";
import { resolveImageAlt } from "@/services/imageAlt";
import { RowEyebrow, RowTitle, RowSubtitle, RowSection } from "./typography";
// EPIC 1 / US 1.1 — atomic-node selection.
import SelectableWrapper from "@/features/admin/builder/SelectableWrapper";

const CLIP_PATHS: Record<string, string> = {
  puddle:
    "path('M 50 2 C 65 0, 78 5, 88 12 C 96 20, 100 32, 99 48 C 100 62, 97 76, 90 86 C 82 95, 70 100, 55 99 C 40 100, 26 96, 16 88 C 6 78, 1 65, 2 50 C 1 36, 5 22, 14 13 C 24 4, 36 1, 50 2 Z')",
  clover:
    "path('M 50 5 C 55 5, 62 0, 68 2 C 78 5, 78 16, 75 22 C 82 15, 92 12, 96 20 C 100 28, 95 38, 88 42 C 95 46, 100 56, 98 64 C 95 74, 85 76, 78 72 C 82 80, 80 92, 72 96 C 64 100, 55 95, 50 88 C 45 95, 36 100, 28 96 C 20 92, 18 80, 22 72 C 15 76, 5 74, 2 64 C 0 56, 5 46, 12 42 C 5 38, 0 28, 4 20 C 8 12, 18 15, 25 22 C 22 16, 22 5, 32 2 C 38 0, 45 5, 50 5 Z')",
  blob: "circle(50% at 50% 50%)",
  diamond:
    "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
  heart:
    "path('M 50 90 C 25 65, 0 50, 0 30 C 0 12, 12 0, 28 0 C 38 0, 46 6, 50 14 C 54 6, 62 0, 72 0 C 88 0, 100 12, 100 30 C 100 50, 75 65, 50 90 Z')",
};

const CAPTION_STYLE: Record<string, React.CSSProperties> = {
  "top-left": { top: 12, left: 12 },
  "top-center": { top: 12, left: "50%", transform: "translateX(-50%)" },
  "top-right": { top: 12, right: 12 },
  "bottom-left": { bottom: 12, left: 12 },
  "bottom-center": { bottom: 12, left: "50%", transform: "translateX(-50%)" },
  "bottom-right": { bottom: 12, right: 12 },
};

const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

/**
 * ImageTextRow — image (with optional clip-path mask) + text block.
 *
 * Uses shared typography wrappers + RowSection for consistency. Clip-path
 * masks and floating caption logic are unique to this row and stay local.
 */
const ImageTextRow = memo(({ row, rowIndex, align = "center", vAlign = "middle" }: { row: PageRow; rowIndex?: number; align?: Alignment; vAlign?: VAlign }) => {
  const c = row.content;
  const prefix = rowIndex !== undefined ? `rows.${rowIndex}.content` : "";
  const l = { ...DEFAULT_ROW_LAYOUT, ...row.layout };
  const maxW = l.fullWidth ? "max-w-none" : "max-w-[1100px]";
  const { ref, isVisible } = useScrollReveal();
  const autoFitRef = useAutoFitText();

  const imgPos = c.image_position || "right";
  const shape = c.image_shape || "default";
  const captionPos = c.caption_position || "bottom-left";

  const captionBg = c.color_caption_bg || "hsl(260 25% 12% / 0.75)";
  const captionText = c.color_caption_text || "#FFFFFF";
  const noteColor = c.color_note || "hsl(var(--foreground) / 0.5)";

  const containerPos = align === "center" ? "mx-auto"
    : align === "right" ? "ml-auto mr-6"
    : "mr-auto ml-6";

  const titleLines: string[] = (c.title_lines || []).map((li: any) =>
    typeof li === "string" ? (li.startsWith("<") ? li : `<p>${li}</p>`) : `<p>${li}</p>`
  );

  const colWidths = l.column_widths || [50, 50];
  const imgWidth = colWidths[0] || 50;
  const textWidth = colWidths[1] || 50;
  const gridCols = imgPos === "left"
    ? `${imgWidth}fr ${textWidth}fr`
    : `${textWidth}fr ${imgWidth}fr`;

  // EPIC 1 / US 1.1 — atomic-node base path for this row.
  const basePath: string[] = ["row", row.id, "widget", row.id, "field"];

  const imageBlock = (
    <SelectableWrapper path={[...basePath, "image"]} label="Image" variant="atom">
      <div className="relative w-full" style={revealStyle(isVisible, imgPos === "left" ? 0 : 3)}>
        <div
          className="relative w-full overflow-hidden"
          style={{
            aspectRatio: "4/5",
            borderRadius: shape === "default" ? 4 : 0,
            clipPath: CLIP_PATHS[shape] || undefined,
            backfaceVisibility: "hidden",
            transform: "translateZ(0)",
          }}
        >
          {c.image_url ? (
            // Below-the-fold images: lazy-load + async decode for fast
            // first paint. The browser only fetches them when the user
            // scrolls close, saving bandwidth on bounce visits.
            <img
              src={c.image_url}
              alt={resolveImageAlt(c.image_alt, c.title || row.strip_title, "section image")}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full" style={{ backgroundColor: "hsl(var(--muted))" }} />
          )}
        </div>
        {c.floating_caption && (
          <div
            className="absolute px-3 py-1.5 rounded-lg font-body text-xs backdrop-blur-md"
            style={{
              ...CAPTION_STYLE[captionPos],
              backgroundColor: captionBg,
              color: captionText,
              backfaceVisibility: "hidden",
            }}
          >
            {c.floating_caption}
          </div>
        )}
      </div>
    </SelectableWrapper>
  );

  const textBlock = (
    <div className="flex flex-col justify-center" style={revealStyle(isVisible, imgPos === "left" ? 2 : 0)}>
      {c.eyebrow && (
        <SelectableWrapper path={[...basePath, "eyebrow"]} label="Eyebrow" variant="atom" inline>
          <RowEyebrow color={c.color_eyebrow}>
            <EditableText sectionKey="page_rows" fieldPath={`${prefix}.eyebrow`} as="span">
              {c.eyebrow}
            </EditableText>
          </RowEyebrow>
        </SelectableWrapper>
      )}
      {titleLines.length > 0 ? (
        <SelectableWrapper path={[...basePath, "title"]} label="Title" variant="atom" inline>
          <RowTitle color={c.color_title}>
            {titleLines.map((line, i) => (
              <span key={i}>{i > 0 && <br />}<span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} /></span>
            ))}
          </RowTitle>
        </SelectableWrapper>
      ) : c.title ? (
        <SelectableWrapper path={[...basePath, "title"]} label="Title" variant="atom" inline>
          <RowTitle color={c.color_title}>
            <EditableText sectionKey="page_rows" fieldPath={`${prefix}.title`} as="span">
              {c.title}
            </EditableText>
          </RowTitle>
        </SelectableWrapper>
      ) : null}
      {c.subtitle && (
        <SelectableWrapper path={[...basePath, "subtitle"]} label="Subtitle" variant="atom" inline>
          <RowSubtitle color={c.subtitle_color}>
            <EditableText sectionKey="page_rows" fieldPath={`${prefix}.subtitle`} as="span">{c.subtitle}</EditableText>
          </RowSubtitle>
        </SelectableWrapper>
      )}
      {c.description && (
        <SelectableWrapper path={[...basePath, "description"]} label="Description" variant="atom">
          <EditableText
            sectionKey="page_rows"
            fieldPath={`${prefix}.description`}
            html
            as="div"
            data-rte-fit=""
            className="font-body-heading leading-[1.6] [&_p]:mb-[5px] [&_p]:mt-[5px]"
            style={{ fontSize: "clamp(0.9rem, 1.5vw, 1.05rem)", color: c.color_description || "hsl(var(--foreground) / 0.75)", height: "auto", overflow: "visible" }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.description) }}
          />
        </SelectableWrapper>
      )}
      {c.note && (
        <div className="mt-rhythm-base pt-3" style={{ borderTop: `1px solid hsl(var(--foreground) / 0.1)` }}>
          <p className="font-body text-xs italic leading-[1.6]" style={{ color: noteColor }}>{c.note}</p>
        </div>
      )}
      {c.cta_url && c.cta_label && (
        <div className="mt-rhythm-base">
          <a href={c.cta_url} target={c.cta_url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
            className="btn-glass interactive font-display text-[10px] uppercase tracking-[0.1em] font-bold px-6 py-3 rounded-full inline-block"
            style={{ backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--primary-foreground))" }}>
            {c.cta_label}
          </a>
        </div>
      )}
    </div>
  );

  return (
    <RowSection
      row={row}
      vAlign={vAlign}
      innerRef={(el) => { (ref as React.MutableRefObject<HTMLElement | null>).current = el; autoFitRef.current = el; }}
    >
      <div
        className={`relative z-10 ${maxW} w-full px-6 lg:pl-24 ${containerPos}`}
        style={{
          display: "grid",
          gridTemplateColumns: `1fr`,
          gap: "2rem",
        }}
      >
        <div
          className="grid grid-cols-1 items-center"
          style={{
            gridTemplateColumns: window.innerWidth > 768 ? gridCols : "1fr",
            gap: "2rem",
          }}
        >
          {imgPos === "left" ? (
            <>
              {imageBlock}
              {textBlock}
            </>
          ) : (
            <>
              {textBlock}
              {imageBlock}
            </>
          )}
        </div>
      </div>
      {c.show_subscribe && (
        <div className="relative z-10 mt-rhythm-loose px-6 lg:pl-24" style={revealStyle(isVisible, 5)}>
          <SubscribeWidget align={align} />
        </div>
      )}
    </RowSection>
  );
});

export default ImageTextRow;
