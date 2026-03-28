import { memo } from "react";
import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/types/rows";
import { sanitizeHtml } from "@/lib/sanitize";
import EditableText from "@/components/admin/EditableText";
import SubscribeWidget from "@/components/SubscribeWidget";
import type { Alignment } from "./PageRows";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";

const CLIP_PATHS: Record<string, string> = {
  puddle:
    "polygon(50% 0%, 80% 5%, 95% 15%, 100% 35%, 98% 60%, 100% 80%, 90% 95%, 70% 100%, 50% 97%, 30% 100%, 10% 95%, 0% 80%, 2% 60%, 0% 35%, 5% 15%, 20% 5%)",
  clover:
    "polygon(50% 0%, 65% 8%, 75% 0%, 88% 8%, 100% 25%, 92% 38%, 100% 50%, 92% 62%, 100% 75%, 88% 92%, 75% 100%, 65% 92%, 50% 100%, 35% 92%, 25% 100%, 12% 92%, 0% 75%, 8% 62%, 0% 50%, 8% 38%, 0% 25%, 12% 8%, 25% 0%, 35% 8%)",
  blob:
    "polygon(30% 2%, 55% 0%, 78% 5%, 95% 18%, 100% 40%, 97% 65%, 88% 85%, 70% 98%, 45% 100%, 22% 95%, 5% 82%, 0% 58%, 3% 32%, 12% 12%)",
};

const CAPTION_STYLE: Record<string, React.CSSProperties> = {
  "top-left": { top: 12, left: 12 },
  "top-center": { top: 12, left: "50%", transform: "translateX(-50%)" },
  "top-right": { top: 12, right: 12 },
  "bottom-left": { bottom: 12, left: 12 },
  "bottom-center": { bottom: 12, left: "50%", transform: "translateX(-50%)" },
  "bottom-right": { bottom: 12, right: 12 },
};

const ImageTextRow = memo(({ row, rowIndex, align = "center" }: { row: PageRow; rowIndex?: number; align?: Alignment }) => {
  const c = row.content;
  const prefix = rowIndex !== undefined ? `rows.${rowIndex}.content` : "";
  const l = { ...DEFAULT_ROW_LAYOUT, ...row.layout };
  const maxW = l.fullWidth ? "max-w-none" : "max-w-[1100px]";
  const { ref, isVisible } = useScrollReveal();

  const imgPos = c.image_position || "right";
  const shape = c.image_shape || "default";
  const captionPos = c.caption_position || "bottom-left";

  const eyebrowColor = c.color_eyebrow || "hsl(var(--primary))";
  const titleColor = c.color_title || "hsl(var(--foreground))";
  const descColor = c.color_description || "hsl(var(--foreground) / 0.7)";
  const captionBg = c.color_caption_bg || "hsl(260 25% 12% / 0.75)";
  const captionText = c.color_caption_text || "#FFFFFF";

  const gradStart = l.gradientStart || "hsl(280 55% 20% / 0.5)";
  const gradEnd = l.gradientEnd || "hsl(286 42% 25% / 0.3)";

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
      {c.title && (
        <h3
          className="font-display font-bold leading-tight mb-4"
          style={{ fontSize: "clamp(1.4rem, 3.5vw, 2.6rem)", color: titleColor }}
        >
          <EditableText sectionKey="page_rows" fieldPath={`${prefix}.title`} as="span">
            {c.title}
          </EditableText>
        </h3>
      )}
      {c.description && (
        <EditableText
          sectionKey="page_rows"
          fieldPath={`${prefix}.description`}
          html
          as="div"
          className="font-body leading-relaxed"
          style={{ fontSize: "clamp(0.8rem, 1.3vw, 1rem)", color: descColor, height: "auto", overflow: "visible" }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.description) }}
        />
      )}
    </div>
  );

  return (
    <section
      ref={ref}
      data-row-id={row.id}
      data-row-type={row.type}
      data-row-title={row.strip_title}
      className="snap-section grain relative min-h-screen flex items-center justify-center"
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
      <div className={`relative z-10 ${maxW} w-full px-6 mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center`}>
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
