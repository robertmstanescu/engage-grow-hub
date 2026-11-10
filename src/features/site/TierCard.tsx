import { memo } from "react";
import { useTagColors } from "@/hooks/useTagColors";

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

const DONE_MARKER = /\bDone looks like(?:,[^:]{0,40})?:\s*/i;

/** Split "…text. Done looks like: outcome." into its two halves. */
export const splitDoneLooksLike = (description: string): { lead: string; label: string; done: string } => {
  const text = typeof description === "string" ? description : "";
  const match = DONE_MARKER.exec(text);
  if (!match) return { lead: text, label: "", done: "" };
  return {
    lead: text.slice(0, match.index).trim(),
    label: match[0].trim(),
    done: text.slice(match.index + match[0].length).trim(),
  };
};

/** Split "From €900 · 2–3 weeks" into the headline price and the rest. */
export const splitPriceLine = (time: string): { price: string; detail: string } => {
  const text = typeof time === "string" ? time.trim() : "";
  const at = text.indexOf("·");
  if (at < 0) return { price: text, detail: "" };
  return { price: text.slice(0, at).trim(), detail: text.slice(at + 1).trim() };
};

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

  return (
    <article
      className="surface-card flex flex-col h-full text-left"
      style={{ padding: "clamp(20px, 2vw, 28px)", ...(accent ? { borderTop: `3px solid ${accent}` } : {}) }}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        {tag ? (
          <span
            className="inline-block font-body font-bold uppercase rounded-full"
            style={{ backgroundColor: tagBgColor || adminColors.bgColor, color: tagTextColor || adminColors.textColor, fontSize: 10, letterSpacing: "0.16em", padding: "5px 10px" }}
          >
            {tag}
          </span>
        ) : <span />}
        {startHere ? (
          <span className="font-hand" style={{ fontSize: 17, lineHeight: 1.2, color: "hsl(var(--link))", transform: "rotate(-3deg)" }}>{startHere}</span>
        ) : null}
      </div>

      {title ? (
        <h3 className="font-display font-bold leading-tight" style={{ color: "hsl(var(--heading))", fontSize: "var(--fs-card-title)" }}>{title}</h3>
      ) : null}
      {subtitle ? (
        <p className="font-body font-semibold mt-1" style={{ color: "hsl(var(--body))", fontSize: 13 }}>{subtitle}</p>
      ) : null}

      {priceLine.price ? (
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid hsl(var(--line-1))" }}>
          <p className="font-display font-bold" style={{ color: "hsl(var(--heading))", fontSize: 20, lineHeight: 1.2 }}>{priceLine.price}</p>
          {priceLine.detail ? (
            <p className="font-body mt-1" style={{ color: "hsl(var(--meta))", fontSize: 12.5 }}>{priceLine.detail}</p>
          ) : null}
        </div>
      ) : null}

      {split.lead ? (
        <p className="font-body mt-4" style={{ color: "hsl(var(--body))", fontSize: 14.5, lineHeight: 1.65 }}>{split.lead}</p>
      ) : null}
      {split.done ? (
        <p className="font-body mt-4" style={{ borderRadius: 14, background: "hsl(var(--gold) / 0.28)", padding: "14px 16px", fontSize: 14, lineHeight: 1.6, color: "hsl(var(--foreground))" }}>
          <strong>{split.label}</strong> {split.done}
        </p>
      ) : null}

      {items.length > 0 ? (
        <div className="mt-5">
          <p className="font-body font-bold uppercase" style={{ color: "hsl(var(--gold-text))", fontSize: 10.5, letterSpacing: "0.2em" }}>{deliverablesLabel}</p>
          <ul className="mt-3 flex flex-col" style={{ gap: 9 }}>
            {items.map((item, i) => (
              <li key={i} className="font-body relative" style={{ color: "hsl(var(--body))", fontSize: 13.5, lineHeight: 1.55, paddingLeft: 16 }}>
                <span aria-hidden className="absolute rounded-full" style={{ left: 0, top: "0.6em", width: 5, height: 5, background: "hsl(var(--heading))" }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {note ? (
        <p className="font-body italic mt-5" style={{ color: "hsl(var(--meta))", fontSize: 12.5, lineHeight: 1.6 }}>{note}</p>
      ) : null}

      <div className="mt-auto pt-6">
        <a href={ctaUrl || "/#contact"} className="link-arrow-mc">
          {price || "Inquire Now"} <span aria-hidden>→</span>
        </a>
      </div>
    </article>
  );
});
TierCard.displayName = "TierCard";

export default TierCard;
