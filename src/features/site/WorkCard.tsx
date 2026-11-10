/**
 * WorkCard — the one card every work surface shares (Work index, work
 * teaser row, admin preview). Four styles (redesign §3):
 *
 *   photo  — cover image on top, title, summary, metric
 *   number — the metric as a big number, title, summary
 *   dark   — deep plum ground, light text
 *   quote  — the pull line as a quote, title and role under it
 *
 * Rules from the spec:
 *   - a photo card without a cover falls back to the number style —
 *     never a broken image;
 *   - a metric linked to an UNAPPROVED proof point hides the number
 *     (the typed label stays);
 *   - titles and summaries clamp at 3 lines; the full text lives on
 *     the case study;
 *   - the pillar colour comes from pillarColors.ts via `--pillar`.
 */
import { Link } from "react-router-dom";
import { safeHref } from "@/services/safeHref";
import { pillarColorFromKey } from "@/lib/constants/pillarColors";
import { transformImageUrl } from "@/services/mediaOptimization";

export interface WorkCardItem {
  slug: string;
  type: string;
  pillar: string;
  title: string;
  summary: string;
  metric: string;
  metric_label: string;
  proof_point_id?: string | null;
  card_style: string;
  pull_line: string;
  honesty_label?: string;
  role_title?: string;
  year?: string;
  cover_image: string;
  cover_image_alt: string;
  link_out: string;
  has_case_study: boolean;
}

interface Props {
  item: WorkCardItem;
  /** Style override (a teaser card may pick its own); empty = the item's. */
  style?: string;
  /** Approval of the linked proof point; undefined = no linked proof. */
  proofApproved?: boolean;
  /** Extra classes on the card element. */
  className?: string;
}

const PILLAR_NAMES: Record<string, string> = {
  ic: "Internal Communications",
  ex: "Employee Experience",
  ops: "People Operations",
  hrbp: "Fractional HRBP",
  pay: "Pay Transparency",
  mgr: "Manager Enablement",
};

const TYPE_NAMES: Record<string, string> = { case: "Case study", artefact: "Artefact", playbook: "Playbook" };

const WorkCard = ({ item, style, proofApproved, className }: Props) => {
  // A photo card with no cover becomes a number card (spec: never a
  // broken image).
  const resolved = (style || item.card_style || "photo") === "photo" && !item.cover_image ? "number" : style || item.card_style || "photo";
  const pillarColor = pillarColorFromKey(item.pillar);
  // A number linked to a proof point shows only while that proof is
  // approved; a typed metric (no link) always shows.
  const showMetric = Boolean(item.metric) && (!item.proof_point_id || proofApproved === true);

  const href = (item.link_out ? safeHref(item.link_out) : "") || (item.has_case_study ? `/work/${item.slug}/` : "");
  const external = Boolean(item.link_out);
  const isDark = resolved === "dark";

  const meta = [PILLAR_NAMES[item.pillar] ?? item.pillar, TYPE_NAMES[item.type] ?? item.type, item.year].filter(Boolean).join(" · ");

  const body = (
    <>
      {resolved === "photo" && item.cover_image && (
        <span className="block w-full overflow-hidden" style={{ aspectRatio: "16 / 9" }}>
          <img
            src={transformImageUrl(item.cover_image, { width: 640, aspectRatio: 16 / 9, quality: 70 })}
            alt={item.cover_image_alt || ""}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        </span>
      )}
      <span className="block p-5">
        <span
          className="flex items-center gap-2 font-body uppercase mb-2"
          style={{ fontSize: "var(--fs-card-label)", letterSpacing: "var(--ls-label, 0.28em)", color: isDark ? "hsl(var(--gold))" : "hsl(var(--gold-text))" }}
        >
          {pillarColor && <span aria-hidden className="inline-block w-2 h-2 rounded-full flex-none" style={{ background: pillarColor }} />}
          {meta}
        </span>
        {resolved === "quote" && item.pull_line ? (
          <span
            className="block font-display font-bold leading-snug mb-3"
            style={{ fontSize: "var(--fs-quote)", lineHeight: 1.15, color: isDark ? "hsl(var(--deep-fg))" : "hsl(var(--heading))" }}
          >
            “{item.pull_line}”
          </span>
        ) : null}
        {resolved === "number" && showMetric ? (
          <span className="block mb-2">
            <span className="block font-display font-extrabold" style={{ fontSize: "var(--fs-stat)", lineHeight: 1, color: pillarColor || "hsl(var(--heading))" }}>
              {item.metric}
            </span>
            {item.metric_label && (
              <span className="block font-body mt-1" style={{ fontSize: "var(--fs-card-label)", color: "hsl(var(--meta))" }}>
                {item.metric_label}
              </span>
            )}
          </span>
        ) : null}
        <span
          className="block font-display font-bold leading-snug line-clamp-3"
          style={{ fontSize: "var(--fs-card-title)", color: isDark ? "hsl(var(--deep-fg))" : "hsl(var(--heading))" }}
        >
          {item.title}
        </span>
        {item.summary && (
          <span className="block font-body mt-2 line-clamp-3" style={{ fontSize: "var(--fs-card-body)", color: isDark ? "hsl(var(--deep-fg) / 0.8)" : "hsl(var(--body))" }}>
            {item.summary}
          </span>
        )}
        {(item.role_title || item.honesty_label) && (
          <span className="block font-body mt-3" style={{ fontSize: "var(--fs-card-label)", color: "hsl(var(--meta))" }}>
            {[item.role_title, item.honesty_label].filter(Boolean).join(" · ")}
          </span>
        )}
      </span>
    </>
  );

  const cardClass = `group block h-full overflow-hidden ${resolved === "dark" ? "mc-card-dark" : "mc-card"} ${href ? "mc-card-lift" : ""} ${className ?? ""}`;
  const cardStyle = pillarColor ? ({ ["--pillar" as string]: pillarColor } as React.CSSProperties) : undefined;

  if (!href) {
    return (
      <article className={cardClass} style={cardStyle} data-card-style={resolved}>
        {body}
      </article>
    );
  }
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cardClass} style={cardStyle} data-card-style={resolved}>
        {body}
      </a>
    );
  }
  return (
    <Link to={href} className={cardClass} style={cardStyle} data-card-style={resolved}>
      {body}
    </Link>
  );
};

export default WorkCard;
