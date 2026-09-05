import { memo, useEffect, useId, useState } from "react";
import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/lib/constants/rowDefaults";
import { sanitizeHtml } from "@/services/sanitize";
import EditableText from "@/features/admin/EditableText";
import SubscribeWidget from "@/features/site/SubscribeWidget";
import type { Alignment, VAlign } from "./PageRows";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import { useAutoFitText } from "@/hooks/useAutoFitText";
import { resolveImageAlt } from "@/services/imageAlt";
import { transformImageUrl, buildImageSrcSet } from "@/services/mediaOptimization";
import { RowEyebrow, RowTitle, RowSubtitle, RowSection } from "./typography";
// EPIC 1 / US 1.1 — atomic-node selection.
import SelectableWrapper from "@/features/admin/builder/SelectableWrapper";

/**
 * Percentage/function-based clip-path values — these scale correctly to
 * any element size on their own, no SVG assist needed.
 */
const CLIP_PATHS: Record<string, string> = {
  blob: "circle(50% at 50% 50%)",
  diamond: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
};

/**
 * `path()` clip-paths, by contrast, do NOT scale — CSS treats a path's
 * coordinates as absolute pixels in the element's own box, not relative
 * percentages. These were authored on a 0–100 grid (as if a 100×100
 * viewBox), so on a real ~300–500px image `clip-path: path(...)` only
 * carved out a tiny sliver in the corner instead of the intended shape.
 * Rescaled to 0–1 here so they can drive an SVG `clipPath` with
 * `clipPathUnits="objectBoundingBox"` instead, which DOES auto-scale to
 * the element — see the `<clipPath>` rendered below.
 */
const OBB_PATHS: Record<string, string> = {
  puddle:
    "M 0.5 0.02 C 0.65 0, 0.78 0.05, 0.88 0.12 C 0.96 0.2, 1 0.32, 0.99 0.48 C 1 0.62, 0.97 0.76, 0.9 0.86 C 0.82 0.95, 0.7 1, 0.55 0.99 C 0.4 1, 0.26 0.96, 0.16 0.88 C 0.06 0.78, 0.01 0.65, 0.02 0.5 C 0.01 0.36, 0.05 0.22, 0.14 0.13 C 0.24 0.04, 0.36 0.01, 0.5 0.02 Z",
  clover:
    "M 0.5 0.05 C 0.55 0.05, 0.62 0, 0.68 0.02 C 0.78 0.05, 0.78 0.16, 0.75 0.22 C 0.82 0.15, 0.92 0.12, 0.96 0.2 C 1 0.28, 0.95 0.38, 0.88 0.42 C 0.95 0.46, 1 0.56, 0.98 0.64 C 0.95 0.74, 0.85 0.76, 0.78 0.72 C 0.82 0.8, 0.8 0.92, 0.72 0.96 C 0.64 1, 0.55 0.95, 0.5 0.88 C 0.45 0.95, 0.36 1, 0.28 0.96 C 0.2 0.92, 0.18 0.8, 0.22 0.72 C 0.15 0.76, 0.05 0.74, 0.02 0.64 C 0 0.56, 0.05 0.46, 0.12 0.42 C 0.05 0.38, 0 0.28, 0.04 0.2 C 0.08 0.12, 0.18 0.15, 0.25 0.22 C 0.22 0.16, 0.22 0.05, 0.32 0.02 C 0.38 0, 0.45 0.05, 0.5 0.05 Z",
  heart:
    "M 0.5 0.9 C 0.25 0.65, 0 0.5, 0 0.3 C 0 0.12, 0.12 0, 0.28 0 C 0.38 0, 0.46 0.06, 0.5 0.14 C 0.54 0.06, 0.62 0, 0.72 0 C 0.88 0, 1 0.12, 1 0.3 C 1 0.5, 0.75 0.65, 0.5 0.9 Z",
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
  const maxW = l.fullWidth ? "max-w-none" : "max-w-[1280px]";
  const { ref, isVisible } = useScrollReveal();
  const autoFitRef = useAutoFitText();

  const imgPos = c.image_position || "right";
  const shape = c.image_shape || "default";
  const captionPos = c.caption_position || "bottom-left";
  // useId() emits colons (e.g. ":r4:"), which aren't valid inside a CSS
  // url(#...) reference — strip them. Per-instance so multiple
  // ImageTextRows on one page never collide on a shared clip-path id.
  const clipId = useId().replace(/:/g, "");
  const obbPath = OBB_PATHS[shape];

  const captionBg = c.color_caption_bg || "hsl(var(--card) / 0.9)";
  const captionText = c.color_caption_text || "var(--row-fg, hsl(var(--foreground)))";
  const noteColor = c.color_note || "color-mix(in srgb, var(--row-fg, hsl(var(--foreground))) 55%, transparent)";

  const containerPos = align === "center" ? "mx-auto"
    : align === "right" ? "ml-auto mr-6"
    : "mr-auto ml-6";

  const titleLines: string[] = (c.title_lines || []).map((li: any) =>
    typeof li === "string" ? (li.startsWith("<") ? li : `<p>${li}</p>`) : `<p>${li}</p>`
  );

  /* Two-column split only above 768px. A matchMedia listener keeps this
     reactive — a one-shot `window.innerWidth` read never updated on
     resize (and broke SSR/preview). */
  const [isWide, setIsWide] = useState(
    typeof window !== "undefined" ? window.matchMedia("(min-width: 769px)").matches : true,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 769px)");
    const onChange = () => setIsWide(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /* column_widths is always [image, text] regardless of which side the
     image sits on — the grid order below handles the position. */
  const colWidths = Array.isArray(c.split_widths) && c.split_widths.length === 2
    ? c.split_widths
    : (Array.isArray(l.column_widths) && l.column_widths.length === 2 ? l.column_widths : [50, 50]);
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
            clipPath: obbPath ? `url(#img-clip-${clipId})` : CLIP_PATHS[shape] || undefined,
            backfaceVisibility: "hidden",
            transform: "translateZ(0)",
          }}
        >
          {obbPath && (
            // objectBoundingBox coordinates (0–1) auto-scale to the
            // element's actual rendered size — unlike a CSS path()
            // clip-path, which treats its numbers as fixed pixels. See
            // the OBB_PATHS comment above for why this exists.
            <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
              <defs>
                <clipPath id={`img-clip-${clipId}`} clipPathUnits="objectBoundingBox">
                  <path d={obbPath} />
                </clipPath>
              </defs>
            </svg>
          )}
          {c.image_url ? (
            // Below-the-fold images: lazy-load + async decode for fast
            // first paint. The browser only fetches them when the user
            // scrolls close, saving bandwidth on bounce visits.
            <img
              src={transformImageUrl(c.image_url, { width: 1200, aspectRatio: 4 / 5 })}
              srcSet={buildImageSrcSet(c.image_url, undefined, 75, 4 / 5)}
              sizes="(min-width: 768px) 50vw, 100vw"
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
    <div className="flex flex-col justify-center min-w-0" style={revealStyle(isVisible, imgPos === "left" ? 2 : 0)}>
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
          <RowTitle icon={c.icon} color={c.color_title}>
            {titleLines.map((line, i) => (
              <span key={i}>{i > 0 && <br />}<span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} /></span>
            ))}
          </RowTitle>
        </SelectableWrapper>
      ) : c.title ? (
        <SelectableWrapper path={[...basePath, "title"]} label="Title" variant="atom" inline>
          <RowTitle icon={c.icon} color={c.color_title}>
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
            className="font-body leading-[1.6] [&_p]:mb-3 [&_p]:mt-3"
            style={{ fontSize: "var(--fs-body)", color: c.color_description || "color-mix(in srgb, var(--row-fg, hsl(var(--foreground))) 80%, transparent)", height: "auto", overflow: "visible" }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.description) }}
          />
        </SelectableWrapper>
      )}
      {c.note && (
        <div className="mt-rhythm-base pt-3" style={{ borderTop: `1px solid var(--row-border, hsl(var(--border)))` }}>
          <p className="font-body text-xs italic leading-[1.6]" style={{ color: noteColor }}>{c.note}</p>
        </div>
      )}
      {c.cta_url && c.cta_label && (
        <div className="mt-rhythm-base">
          <a href={c.cta_url} target={c.cta_url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
            className="btn-ink"
>
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
        className={`relative z-10 ${maxW} w-full row-container ${containerPos}`}
        style={{
          display: "grid",
          gridTemplateColumns: `1fr`,
          gap: "2rem",
        }}
      >
        <div
          className="grid grid-cols-1 items-center"
          style={{
            gridTemplateColumns: isWide ? gridCols : "1fr",
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
        <div className="relative z-10 mt-rhythm-loose row-container" style={revealStyle(isVisible, 5)}>
          <SubscribeWidget align={align} />
        </div>
      )}
    </RowSection>
  );
});

export default ImageTextRow;
