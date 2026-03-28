import { memo } from "react";
import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/types/rows";
import { sanitizeHtml } from "@/lib/sanitize";
import EditableText from "@/components/admin/EditableText";
import SubscribeWidget from "@/components/SubscribeWidget";
import type { Alignment } from "./PageRows";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";

const ProfileRow = memo(({ row, rowIndex, align = "center" }: { row: PageRow; rowIndex?: number; align?: Alignment }) => {
  const c = row.content;
  const prefix = rowIndex !== undefined ? `rows.${rowIndex}.content` : "";
  const l = { ...DEFAULT_ROW_LAYOUT, ...row.layout };
  const maxW = l.fullWidth ? "max-w-none" : "max-w-[1100px]";
  const { ref, isVisible } = useScrollReveal();

  const eyebrowColor = c.color_eyebrow || "hsl(var(--primary))";
  const nameColor = c.color_name || "#FFFFFF";
  const roleColor = c.color_role || "hsl(var(--accent))";
  const credBg = c.color_credential_bg || "hsl(280 55% 24% / 0.6)";
  const credText = c.color_credential_text || "#FFFFFF";
  const bodyColor = c.color_body || "hsl(var(--foreground) / 0.7)";

  const gradStart = l.gradientStart || "hsl(280 55% 20% / 0.5)";
  const gradEnd = l.gradientEnd || "hsl(286 42% 25% / 0.3)";

  const credentials: string[] = c.credentials || [];

  return (
    <section
      ref={ref}
      data-row-id={row.id}
      data-row-type={row.type}
      data-row-title={row.strip_title}
      className="snap-section grain relative min-h-screen flex items-center justify-center"
      style={{
        backgroundColor: row.bg_color || "hsl(260 20% 6%)",
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

      <div className={`relative z-10 ${maxW} w-full px-6 mx-auto`}>
        {c.eyebrow && (
          <span
            className="font-body tracking-[0.35em] uppercase block mb-6 text-center"
            style={{ ...revealStyle(isVisible, 0), fontSize: "clamp(7px, 0.9vw, 10px)", color: eyebrowColor }}
          >
            <EditableText sectionKey="page_rows" fieldPath={`${prefix}.eyebrow`} as="span">
              {c.eyebrow}
            </EditableText>
          </span>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-8 md:gap-12 items-start">
          {/* Image with glass border */}
          <div className="flex flex-col items-center" style={revealStyle(isVisible, 1)}>
            <div
              className="relative rounded-xl overflow-hidden"
              style={{
                width: "100%",
                maxWidth: 340,
                aspectRatio: "3/4",
                padding: 4,
                background: "linear-gradient(135deg, hsl(280 55% 35% / 0.4), hsl(46 75% 60% / 0.15))",
                boxShadow:
                  "0 0 40px -10px hsl(280 55% 30% / 0.4), 0 0 80px -20px hsl(280 55% 40% / 0.15), inset 0 1px 0 hsl(0 0% 100% / 0.1)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                backfaceVisibility: "hidden",
                transform: "translateZ(0)",
              }}
            >
              <div className="w-full h-full rounded-lg overflow-hidden">
                {c.image_url ? (
                  <img src={c.image_url} alt={c.name || ""} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full" style={{ backgroundColor: "hsl(var(--muted))" }} />
                )}
              </div>
            </div>

            {/* Name tag */}
            {(c.name || c.role) && (
              <div className="mt-4 text-center" style={revealStyle(isVisible, 2)}>
                {c.name && (
                  <p className="font-display font-bold text-lg" style={{ color: nameColor }}>
                    <EditableText sectionKey="page_rows" fieldPath={`${prefix}.name`} as="span">
                      {c.name}
                    </EditableText>
                  </p>
                )}
                {c.role && (
                  <p className="font-body text-xs tracking-wider uppercase mt-1" style={{ color: roleColor }}>
                    <EditableText sectionKey="page_rows" fieldPath={`${prefix}.role`} as="span">
                      {c.role}
                    </EditableText>
                  </p>
                )}
              </div>
            )}

            {/* Credentials */}
            {credentials.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 justify-center" style={revealStyle(isVisible, 3)}>
                {credentials.map((cred, i) => (
                  <span
                    key={i}
                    className="font-body text-[10px] tracking-wider px-3 py-1 rounded-full"
                    style={{ backgroundColor: credBg, color: credText, backdropFilter: "blur(8px)" }}
                  >
                    {cred}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Body content */}
          <div className="flex flex-col justify-center" style={revealStyle(isVisible, 4)}>
            {c.body && (
              <EditableText
                sectionKey="page_rows"
                fieldPath={`${prefix}.body`}
                html
                as="div"
                className="font-body leading-relaxed prose-sm"
                style={{
                  fontSize: "clamp(0.85rem, 1.3vw, 1rem)",
                  color: bodyColor,
                  height: "auto",
                  overflow: "visible",
                }}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.body) }}
              />
            )}
          </div>
        </div>

        {c.show_subscribe && (
          <div className="mt-10" style={revealStyle(isVisible, 5)}>
            <SubscribeWidget align={align} />
          </div>
        )}
      </div>
    </section>
  );
});

export default ProfileRow;
