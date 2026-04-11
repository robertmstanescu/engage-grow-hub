import { memo } from "react";
import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/types/rows";
import { sanitizeHtml } from "@/lib/sanitize";
import EditableText from "@/components/admin/EditableText";
import SubscribeWidget from "@/components/SubscribeWidget";
import type { Alignment, VAlign } from "./PageRows";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import { useAutoFitText } from "@/hooks/useAutoFitText";

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

  const eyebrowColor = c.color_eyebrow || "hsl(var(--primary))";
  const titleColor = c.color_title || "hsl(var(--foreground))";
  const descColor = c.color_description || "hsl(var(--foreground) / 0.7)";
  const captionBg = c.color_caption_bg || "hsl(260 25% 12% / 0.75)";
  const captionText = c.color_caption_text || "#FFFFFF";
  const noteColor = c.color_note || "hsl(var(--foreground) / 0.5)";

  const gradStart = l.gradientStart || "hsl(280 55% 20% / 0.5)";
  const gradEnd = l.gradientEnd || "hsl(286 42% 25% / 0.3)";

  const containerPos = align === "center" ? "mx-auto"
    : align === "right" ? "ml-auto mr-6"
    : "mr-auto ml-6";

  const titleLines: string[] = (c.title_lines || []).map((li: any) =>
    typeof li === "string" ? (li.startsWith("<") ? li : `<p>${li}</p>`) : `<p>${li}</p>`
  );

  const imageBlock = (
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
          <img src={c.image_url} alt={c.title || ""} className="w-full h-full object-cover" loading="lazy" />
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
  );

  const textBlock = (
    <div className="flex flex-col justify-center" style={revealStyle(isVisible, imgPos === "left" ? 2 : 0)}>
      {c.eyebrow && (
        <span
          className="font-body tracking-[0.35em] uppercase block mb-3"
          style={{ fontSize: "clamp(7px, 0.9vw, 10px)", color: eyebrowColor }}
        >
          <EditableText sectionKey="page_rows" fieldPath={`${prefix}.eyebrow`} as="span">
            {c.eyebrow}
          </EditableText>
        </span>
      )}
      {titleLines.length > 0 ? (
        <h3 className="font-display font-bold leading-tight mb-4" style={{ fontSize: "clamp(1.4rem, 3.5vw, 2.6rem)", color: titleColor }}>
          {titleLines.map((line, i) => (
            <span key={i}>{i > 0 && <br />}<span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} /></span>
          ))}
        </h3>
      ) : c.title ? (
        <h3
          className="font-display font-bold leading-tight mb-4"
          style={{ fontSize: "clamp(1.4rem, 3.5vw, 2.6rem)", color: titleColor }}
        >
          <EditableText sectionKey="page_rows" fieldPath={`${prefix}.title`} as="span">
            {c.title}
          </EditableText>
        </h3>
      ) : null}
      {c.subtitle && (
        <p className="leading-tight mb-4" style={{ fontFamily: "'Architects Daughter', cursive", color: c.subtitle_color || "inherit", fontSize: "clamp(0.9rem, 2vw, 1.2rem)" }}>
          <EditableText sectionKey="page_rows" fieldPath={`${prefix}.subtitle`} as="span">{c.subtitle}</EditableText>
        </p>
      )}
      {c.description && (
        <EditableText
          sectionKey="page_rows"
          fieldPath={`${prefix}.description`}
          html
          as="div"
          className="font-body leading-relaxed [&_p]:mb-[5px] [&_p]:mt-[5px]"
          style={{ fontSize: "clamp(0.8rem, 1.3vw, 1rem)", color: descColor, height: "auto", overflow: "visible" }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.description) }}
        />
      )}
      {c.note && (
        <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${eyebrowColor}30` }}>
          <p className="font-body text-xs italic leading-relaxed" style={{ color: noteColor }}>{c.note}</p>
        </div>
      )}
      {c.cta_url && c.cta_label && (
        <div className="mt-5">
          <a href={c.cta_url} target={c.cta_url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
            className="btn-glass font-display text-[10px] uppercase tracking-[0.1em] font-bold px-6 py-3 rounded-full transition-all duration-500 hover:opacity-85 inline-block"
            style={{ backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--primary-foreground))" }}>
            {c.cta_label}
          </a>
        </div>
      )}
    </div>
  );

  return (
    <section
      ref={(el) => { (ref as React.MutableRefObject<HTMLElement | null>).current = el; autoFitRef.current = el; }}
      data-row-id={row.id}
      data-row-type={row.type}
      data-row-title={row.strip_title}
      className={`snap-section grain relative min-h-screen flex ${vAlign === "top" ? "items-start" : vAlign === "bottom" ? "items-end" : "items-center"} justify-center`}
      style={{
        backgroundColor: row.bg_color || "hsl(var(--background))",
        isolation: "isolate",
        padding: "24px 0",
        scrollMarginTop: "0px",
        ...(l.bgImage ? { backgroundImage: `url(${l.bgImage})`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
      }}
    >
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 20% 80%, ${gradStart}, transparent), radial-gradient(ellipse 60% 50% at 80% 20%, ${gradEnd}, transparent)`,
          transform: "translateZ(0)",
          willChange: "transform",
        }}
      />
      <div className={`relative z-10 ${maxW} w-full px-6 ${containerPos} grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center`}>
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
      {c.show_subscribe && (
        <div className="relative z-10 mt-10 px-6" style={revealStyle(isVisible, 5)}>
          <SubscribeWidget align={align} />
        </div>
      )}
    </section>
  );
});

export default ImageTextRow;
