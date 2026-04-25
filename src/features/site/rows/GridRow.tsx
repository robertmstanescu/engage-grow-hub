import { memo, useEffect, useState } from "react";
import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/types/rows";
import { sanitizeHtml } from "@/services/sanitize";
import EditableText from "@/features/admin/EditableText";
import SubscribeWidget from "@/features/site/SubscribeWidget";
import type { Alignment, VAlign } from "./PageRows";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import { useAutoFitText } from "@/hooks/useAutoFitText";
import { RowEyebrow, RowTitle, RowSubtitle, RowBody, RowSection } from "./typography";

const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

/* ──────────────────────────────────────────────────────────────────────
 * parseStatValue
 * ──────────────────────────────────────────────────────────────────────
 * Splits a display value like "$2.5k", "150+", "99%", "1,200" into
 *   { prefix, number, suffix, decimals }
 * so we can animate just the numeric portion and reconstruct the label
 * (currency symbol, %, +, k, m, etc.) on every frame. Returns
 * `number: null` when no numeric portion is found — the caller should
 * then render the raw value verbatim (no animation).
 * ──────────────────────────────────────────────────────────────────── */
const parseStatValue = (raw: string) => {
  const match = String(raw).match(/^(\D*?)([\d,]+(?:\.\d+)?)(.*)$/);
  if (!match) return { prefix: "", number: null as number | null, suffix: "", decimals: 0 };
  const [, prefix, numStr, suffix] = match;
  const cleaned = numStr.replace(/,/g, "");
  const decimals = cleaned.includes(".") ? cleaned.split(".")[1].length : 0;
  const number = parseFloat(cleaned);
  return { prefix, number: Number.isFinite(number) ? number : null, suffix, decimals };
};

/* useCountUp — easeOutQuad animation from 0 → target over `duration` ms.
 * Resets to 0 when `active` flips false so the animation replays each
 * time the section re-enters the viewport. requestAnimationFrame keeps
 * it smooth without leaking intervals on unmount. */
const useCountUp = (target: number | null, active: boolean, duration = 1500) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active || target === null) {
      if (!active) setValue(0);
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const elapsed = ts - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - (1 - t) * (1 - t);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return value;
};

const formatNumber = (n: number, decimals: number) =>
  decimals > 0
    ? n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : Math.round(n).toLocaleString();

const StatUnit = memo(({ value, label, colors, isVisible, idx }: {
  value: string; label: string; colors: Record<string, string>;
  isVisible: boolean; idx: number;
}) => {
  const { prefix, number, suffix, decimals } = parseStatValue(value);
  const animated = useCountUp(number, isVisible);
  const display =
    number === null ? value : `${prefix}${formatNumber(animated, decimals)}${suffix}`;
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center py-rhythm-base px-4"
      style={revealStyle(isVisible, idx + 3)}
    >
      <p
        className="font-display font-black leading-none tabular-nums"
        style={{ color: colors.statNumber, fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
      >
        {display}
      </p>
      {label && (
        <p
          className="font-body text-[10px] tracking-[0.2em] uppercase mt-3 text-center leading-[1.6] whitespace-pre-line"
          style={{ color: colors.statLabel }}
        >
          {label}
        </p>
      )}
    </div>
  );
});

const AchievementCard = memo(({ text, colors, cardBg, isVisible, idx }: {
  text: string; colors: Record<string, string>; cardBg: string;
  isVisible: boolean; idx: number;
}) => (
  <div
    className="rounded-xl px-5 py-4 flex items-start gap-3 interactive"
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
    <p className="font-body-heading text-sm leading-[1.6] [&_p]:mb-[5px] [&_p]:mt-[5px]" style={{ color: colors.cardDesc }}>
      {text}
    </p>
  </div>
));

/**
 * GridRow — text header + stats block + achievement grid.
 *
 * Uses shared typography wrappers (RowEyebrow / RowTitle / RowSubtitle) for
 * the header. Stats and achievement cards keep custom typography because
 * their numeric/list nature requires distinct sizing.
 */
const GridRow = memo(({ row, rowIndex, align = "center", vAlign = "middle" }: { row: PageRow; rowIndex?: number; align?: Alignment; vAlign?: VAlign }) => {
  const c = row.content;
  const prefix = rowIndex !== undefined ? `rows.${rowIndex}.content` : "";
  const l = { ...DEFAULT_ROW_LAYOUT, ...row.layout };
  const maxW = l.fullWidth ? "max-w-none" : "max-w-[1100px]";
  const { ref, isVisible } = useScrollReveal();
  const autoFitRef = useAutoFitText();

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

  const containerPos = align === "center" ? "mx-auto"
    : align === "right" ? "ml-auto mr-6"
    : "mr-auto ml-6";
  const contentAlign = align === "center" ? "text-center"
    : align === "right" ? "text-right"
    : "text-left";

  const titleLines: string[] = (c.title_lines || []).map((li: any) =>
    typeof li === "string" ? (li.startsWith("<") ? li : `<p>${li}</p>`) : `<p>${li}</p>`
  );

  const stats: { value: string; label: string }[] = (c.stats || []).slice(0, 3);
  const achievements: string[] = c.achievements || [];

  const legacyItems = c.items || [];
  const effectiveStats = stats.length > 0 ? stats : legacyItems
    .filter((i: any) => i.type === "stat")
    .map((i: any) => ({ value: `${i.number || "0"}${i.suffix || ""}`, label: i.label || "" }))
    .slice(0, 3);
  const effectiveAchievements = achievements.length > 0 ? achievements : legacyItems
    .filter((i: any) => i.type === "list")
    .flatMap((i: any) => i.list_items || []);

  return (
    <RowSection
      row={row}
      vAlign={vAlign}
      defaultBg="hsl(260 20% 6%)"
      innerRef={(el) => { (ref as React.MutableRefObject<HTMLElement | null>).current = el; autoFitRef.current = el; }}
    >
      <div className={`relative z-10 ${maxW} w-full px-6 ${containerPos} ${contentAlign}`}>
        <div className="mb-rhythm-loose">
          {c.eyebrow && (
            <RowEyebrow color={c.color_eyebrow} style={revealStyle(isVisible, 0)}>
              <EditableText sectionKey="page_rows" fieldPath={`${prefix}.eyebrow`} as="span">
                {c.eyebrow}
              </EditableText>
            </RowEyebrow>
          )}

          {titleLines.length > 0 ? (
            <RowTitle color={c.color_title} style={revealStyle(isVisible, 1)}>
              {titleLines.map((line, i) => (
                <span key={i}>{i > 0 && <br />}<span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} /></span>
              ))}
            </RowTitle>
          ) : c.title ? (
            <RowTitle color={c.color_title} style={revealStyle(isVisible, 1)}>
              <EditableText sectionKey="page_rows" fieldPath={`${prefix}.title`} as="span">
                {c.title}
              </EditableText>
            </RowTitle>
          ) : null}

          {c.subtitle && (
            <RowSubtitle color={c.subtitle_color} style={revealStyle(isVisible, 1.5)}>
              <EditableText sectionKey="page_rows" fieldPath={`${prefix}.subtitle`} as="span">{c.subtitle}</EditableText>
            </RowSubtitle>
          )}

          {c.description && (
            <EditableText
              sectionKey="page_rows"
              fieldPath={`${prefix}.description`}
              html
              as="div"
              data-rte-fit=""
              className={`font-body-heading leading-[1.6] max-w-[600px] [&_p]:mb-[5px] [&_p]:mt-[5px] ${align === "right" ? "ml-auto" : align === "center" ? "mx-auto" : ""}`}
              style={{ ...revealStyle(isVisible, 2), fontSize: "clamp(0.9rem, 1.5vw, 1.05rem)", color: c.color_description || "hsl(var(--foreground) / 0.75)" }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.description || "") }}
            />
          )}
        </div>

        {effectiveStats.length > 0 && (
          <div
            className="rounded-xl flex flex-col sm:flex-row mb-rhythm-loose overflow-hidden"
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

        {effectiveAchievements.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-rhythm-base">
            {effectiveAchievements.map((text: string, i: number) => (
              <AchievementCard key={i} text={text} colors={colors} cardBg={cardBg} isVisible={isVisible} idx={i} />
            ))}
          </div>
        )}

        {c.note && (
          <div className="mt-rhythm-base pt-3" style={{ borderTop: `1px solid ${colors.border}` }}>
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

        {c.show_subscribe && (
          <div className="mt-rhythm-loose" style={revealStyle(isVisible, 10)}>
            <SubscribeWidget align={align} />
          </div>
        )}
      </div>
    </RowSection>
  );
});

export default GridRow;
