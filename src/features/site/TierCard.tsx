import { memo } from "react";
import { safeHref } from "@/services/safeHref";
import { useTagColors } from "@/hooks/useTagColors";
import { splitDoneLooksLike, splitPriceLine } from "./tierText";

/**
 * TierCard: one engagement tier, shown three across on a service page
 * (redesign, "What we can help with").
 *
 * It reads the SAME fields as the carousel `ServiceCard` and adds no
 * copy of its own: the layout only re-arranges what the owner wrote.
 *   - `time` ("From €900 · 2–3 weeks · ~15–20 hours") is shown as a
 *     price line (the part before the first "·") and a small detail line.
 *   - A description that contains "Done looks like:" is shown as the
 *     description plus a highlighted "Done looks like" box. An explicit
 *     `doneLooksLike` wins over the split.
 *   - `price` is the button label, as on the carousel card.
 */
export interface TierCardProps {
  tag?: string;
  tagType?: string;
  tagBgColor?: string;
  tagTextColor?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  deliverables?: string[];
  deliverablesLabel?: string;
  price?: string;
  time?: string;
  note?: string;
  ctaUrl?: string;
  doneLooksLike?: string;
  startHere?: string;
  /** Pillar colour for the thin top border. */
  accent?: string;
}

const TierCard = memo(({
  tag, tagType = "", tagBgColor, tagTextColor, title, subtitle, description = "", deliverables,
  deliverablesLabel = "What's inside", price, time = "", note, ctaUrl, doneLooksLike, startHere, accent,
}: TierCardProps) => {
  const { getTagColors } = useTagColors();
  const adminColors = getTagColors(tagType);
  const split = doneLooksLike
    ? { lead: description, label: "Done looks like:", done: doneLooksLike }
    : splitDoneLooksLike(description);
  const priceLine = splitPriceLine(time);
  const items = Array.isArray(deliverables) ? deliverables.filter((d) => typeof d === "string" && d.trim()) : [];

  /* Sizes, gaps and colours are the tier card of the service artboards
     (ServiceIC and its five siblings), value for value. */
  const tone = accent || "hsl(var(--heading))";
  return (
    <article
      className="surface-card flex flex-col h-full text-left"
      style={{ padding: "clamp(22px, 2.1vw, 30px)", gap: 14, ...(accent ? { borderTop: `4px solid ${accent}` } : {}) }}
    >
      <div className="flex items-center justify-between gap-3" style={{ minHeight: 26 }}>
        {tag ? (
          <span
            className="inline-block font-body font-bold uppercase rounded-full"
            style={{ backgroundColor: tagBgColor || adminColors.bgColor || tone, color: tagTextColor || adminColors.textColor, fontSize: "var(--fs-chip)", letterSpacing: "0.16em", lineHeight: 1.3, padding: "6px 12px" }}
          >
            {tag}
          </span>
        ) : <span />}
        {startHere ? (
          <span className="font-hand inline-block" style={{ fontSize: 18, lineHeight: 1.4, color: tone, transform: "rotate(-3deg)" }}>{startHere}</span>
        ) : null}
      </div>

      {(title || subtitle) ? (
        <div className="flex flex-col" style={{ gap: 4 }}>
          {title ? (
            <h3 className="font-display font-extrabold" style={{ color: "hsl(var(--heading))", fontSize: "var(--fs-tier-title)", lineHeight: 1.1 }}>{title}</h3>
          ) : null}
          {subtitle ? (
            <p className="font-body font-semibold" style={{ color: "hsl(var(--body))", fontSize: 14, lineHeight: 1.5 }}>{subtitle}</p>
          ) : null}
        </div>
      ) : null}

      {priceLine.price ? (
        <div className="flex flex-col" style={{ gap: 2, padding: "14px 0", borderTop: "1px solid hsl(var(--line-1))", borderBottom: "1px solid hsl(var(--line-1))" }}>
          <p className="font-display font-bold" style={{ color: tone, fontSize: "var(--fs-tier-price)", lineHeight: 1.3 }}>{priceLine.price}</p>
          {priceLine.detail ? (
            <p className="font-body" style={{ color: "hsl(var(--body))", fontSize: 13, lineHeight: 1.5 }}>{priceLine.detail}</p>
          ) : null}
        </div>
      ) : null}

      {split.lead ? (
        <p className="font-body" style={{ color: "hsl(var(--body))", fontSize: 15, lineHeight: 1.7 }}>{split.lead}</p>
      ) : null}
      {split.done ? (
        <p className="font-body" style={{ borderRadius: 14, background: "rgba(250, 236, 192, 0.55)", padding: "14px 16px", fontSize: 14, lineHeight: 1.6, color: "hsl(var(--foreground))" }}>
          <strong>{split.label}</strong> {split.done}
        </p>
      ) : null}

      {items.length > 0 ? (
        <div className="flex flex-col" style={{ gap: 10 }}>
          <p className="font-body font-bold uppercase" style={{ color: "hsl(var(--gold-text))", fontSize: "var(--fs-chip)", letterSpacing: "0.22em" }}>{deliverablesLabel}</p>
          <ul className="flex flex-col" style={{ gap: 8 }}>
            {items.map((item, i) => (
              <li key={i} className="font-body flex items-start" style={{ gap: 10, color: "hsl(var(--body))", fontSize: 14, lineHeight: 1.55 }}>
                <span aria-hidden className="rounded-full flex-none" style={{ marginTop: 7, width: 6, height: 6, background: tone }} />
                <span className="min-w-0" style={{ overflowWrap: "anywhere" }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {note ? (
        <p className="font-body italic" style={{ color: "hsl(var(--body))", fontSize: 13, lineHeight: 1.6 }}>{note}</p>
      ) : null}

      <div className="flex-grow" />
      <a href={safeHref(ctaUrl, "/#contact")} className="inline-flex items-center font-body font-semibold" style={{ gap: 10, fontSize: 16, color: tone, textDecoration: "none" }}>
        {price || "Inquire Now"} <span aria-hidden>→</span>
      </a>
    </article>
  );
});
TierCard.displayName = "TierCard";

export default TierCard;
