import { memo } from "react";
import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/types/rows";
import { sanitizeHtml } from "@/lib/sanitize";
import EditableText from "@/components/admin/EditableText";
import SubscribeWidget from "@/components/SubscribeWidget";
import type { Alignment } from "./PageRows";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";

const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

/* ── Stat Unit ── */
const StatUnit = memo(({ value, label, colors, isVisible, idx }: {
  value: string; label: string; colors: Record<string, string>;
  isVisible: boolean; idx: number;
}) => (
  <div
    className="flex-1 flex flex-col items-center justify-center py-6 px-4"
    style={revealStyle(isVisible, idx + 3)}
  >
    <p
      className="font-display font-black leading-none"
      style={{ color: colors.statNumber, fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
    >
      {value}
    </p>
    {label && (
      <p
        className="font-body text-[10px] tracking-[0.2em] uppercase mt-3 text-center leading-relaxed whitespace-pre-line"
        style={{ color: colors.statLabel }}
      >
        {label}
      </p>
    )}
  </div>
));

/* ── Achievement Card ── */
const AchievementCard = memo(({ text, colors, cardBg, isVisible, idx }: {
  text: string; colors: Record<string, string>; cardBg: string;
  isVisible: boolean; idx: number;
}) => (
  <div
    className="rounded-xl px-5 py-4 flex items-start gap-3"
    style={{
      ...revealStyle(isVisible, idx + 6),
      backgroundColor: cardBg,
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      border: `1px solid ${colors.border}`,
    }}
  >
    <span
      className="inline-block mt-[7px] flex-shrink-0"
      style={{ width: 16, height: 2, backgroundColor: colors.statNumber, borderRadius: 1 }}
    />
    <p className="font-body text-sm leading-relaxed [&_p]:mb-[5px] [&_p]:mt-[5px]" style={{ color: colors.cardDesc }}>
      {text}
    </p>
  </div>
));

/* ── Main Row ── */
const GridRow = memo(({ row, rowIndex, align = "center" }: { row: PageRow; rowIndex?: number; align?: Alignment }) => {
  const c = row.content;
  const prefix = rowIndex !== undefined ? `rows.${rowIndex}.content` : "";
  const l = { ...DEFAULT_ROW_LAYOUT, ...row.layout };
  const maxW = l.fullWidth ? "max-w-none" : "max-w-[1100px]";
  const { ref, isVisible } = useScrollReveal();

  const eyebrowColor = c.color_eyebrow || "hsl(var(--primary))";
  const titleColor = c.color_title || "hsl(var(--foreground))";
  const descColor = c.color_description || "hsl(var(--foreground) / 0.7)";
  const noteColor = c.color_note || "hsl(var(--foreground) / 0.5)";

  const cardBg = c.color_card_bg || "hsl(260 25% 12% / 0.5)";

  const colors = {
    border: c.color_card_border || "hsl(280 20% 25% / 0.35)",
    borderHover: c.color_card_border_hover || "hsl(var(--accent))",
    cardTitle: c.color_card_title || "#FFFFFF",
    cardDesc: c.color_card_description || "hsl(var(--foreground) / 0.6)",
    statNumber: c.color_stat_number || "hsl(var(--accent))",
    statLabel: c.color_stat_label || "hsl(var(--foreground) / 0.5)",
    statSuffix: c.color_stat_suffix || c.color_stat_number || "hsl(var(--accent))",
  };

  const gradStart = l.gradientStart || "hsl(280 55% 20% / 0.5)";
  const gradEnd = l.gradientEnd || "hsl(286 42% 25% / 0.3)";

  const titleLines: string[] = (c.title_lines || []).map((li: any) =>
    typeof li === "string" ? (li.startsWith("<") ? li : `<p>${li}</p>`) : `<p>${li}</p>`
  );

  /* Parse items into stats + achievements */
  const stats: { value: string; label: string }[] = (c.stats || []).slice(0, 3);
  const achievements: string[] = c.achievements || [];

  /* Legacy fallback */
  const legacyItems = c.items || [];
  const effectiveStats = stats.length > 0 ? stats : legacyItems
    .filter((i: any) => i.type === "stat")
    .map((i: any) => ({ value: `${i.number || "0"}${i.suffix || ""}`, label: i.label || "" }))
    .slice(0, 3);
  const effectiveAchievements = achievements.length > 0 ? achievements : legacyItems
    .filter((i: any) => i.type === "list")
    .flatMap((i: any) => i.list_items || []);

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
        {/* ── HEADER SECTION ── */}
        <div className="mb-12">
          {c.eyebrow && (
            <span
              className="font-body tracking-[0.35em] uppercase block mb-3"
              style={{ ...revealStyle(isVisible, 0), fontSize: "clamp(7px, 0.9vw, 10px)", color: eyebrowColor }}
            >
              <EditableText sectionKey="page_rows" fieldPath={`${prefix}.eyebrow`} as="span">
                {c.eyebrow}
              </EditableText>
            </span>
          )}

          {titleLines.length > 0 ? (
            <h3 className="font-display font-bold leading-tight mb-3" style={{ ...revealStyle(isVisible, 1), fontSize: "clamp(1.4rem, 3.5vw, 2.6rem)", color: titleColor }}>
              {titleLines.map((line, i) => (
                <span key={i}>{i > 0 && <br />}<span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} /></span>
              ))}
            </h3>
          ) : c.title ? (
            <h3
              className="font-display font-bold leading-tight mb-3"
              style={{ ...revealStyle(isVisible, 1), fontSize: "clamp(1.4rem, 3.5vw, 2.6rem)", color: titleColor }}
            >
              <EditableText sectionKey="page_rows" fieldPath={`${prefix}.title`} as="span">
                {c.title}
              </EditableText>
            </h3>
          ) : null}

          {c.subtitle && (
            <p className="leading-tight mb-4" style={{ ...revealStyle(isVisible, 1.5), fontFamily: "'Architects Daughter', cursive", color: c.subtitle_color || "inherit", fontSize: "clamp(0.9rem, 2vw, 1.2rem)" }}>
              <EditableText sectionKey="page_rows" fieldPath={`${prefix}.subtitle`} as="span">{c.subtitle}</EditableText>
            </p>
          )}

          {c.description && (
            <EditableText
              sectionKey="page_rows"
              fieldPath={`${prefix}.description`}
              html
              as="div"
              className="font-body leading-relaxed max-w-[600px] [&_p]:mb-[5px] [&_p]:mt-[5px]"
              style={{ ...revealStyle(isVisible, 2), fontSize: "clamp(0.8rem, 1.3vw, 1rem)", color: descColor }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.description || "") }}
            />
          )}
        </div>

        {/* ── STATS BLOCK ── */}
        {effectiveStats.length > 0 && (
          <div
            className="rounded-xl flex flex-col sm:flex-row mb-10 overflow-hidden"
            style={{
              backgroundColor: cardBg,
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: `1px solid ${colors.border}`,
            }}
          >
            {effectiveStats.map((s: { value: string; label: string }, i: number) => (
              <StatUnit key={i} value={s.value} label={s.label} colors={colors} isVisible={isVisible} idx={i} />
            ))}
          </div>
        )}

        {/* ── ACHIEVEMENT GRID ── */}
        {effectiveAchievements.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {effectiveAchievements.map((text: string, i: number) => (
              <AchievementCard key={i} text={text} colors={colors} cardBg={cardBg} isVisible={isVisible} idx={i} />
            ))}
          </div>
        )}

        {c.note && (
          <div className="mt-6 pt-3" style={{ borderTop: `1px solid ${colors.border}` }}>
            <p className="font-body text-xs italic leading-relaxed" style={{ color: noteColor }}>{c.note}</p>
          </div>
        )}

        {c.cta_url && c.cta_label && (
          <div className="mt-6">
            <a href={c.cta_url} target={c.cta_url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
              className="btn-glass font-display text-[10px] uppercase tracking-[0.1em] font-bold px-6 py-3 rounded-full transition-all duration-500 hover:opacity-85 inline-block"
              style={{ backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--primary-foreground))" }}>
              {c.cta_label}
            </a>
          </div>
        )}

        {c.show_subscribe && (
          <div className="mt-10" style={revealStyle(isVisible, 10)}>
            <SubscribeWidget align={align} />
          </div>
        )}
      </div>
    </section>
  );
});

export default GridRow;
