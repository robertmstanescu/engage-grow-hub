/**
 * WorkCard — the one card every work surface shares (Work index, work
 * teaser row, admin preview). A glass card with the pillar's colour on
 * its top edge, a type chip, the title, the summary and a foot line.
 * Four styles (redesign §3):
 *
 *   photo  — cover image on top, the metric in the foot line
 *   number — the metric as a big number above the title
 *   dark   — deep plum ground, light text
 *   quote  — the pull line as a quote above the title
 *
 * Rules from the spec:
 *   - a photo card without a cover falls back to the number style,
 *     and a cover that fails to load is removed: never a broken image;
 *   - a metric linked to an UNAPPROVED proof point hides the number
 *     (the typed label stays);
 *   - titles and summaries clamp at 3 lines; the full text lives on
 *     the case study;
 *   - the pillar colour comes from pillarColors.ts via `--pillar`;
 *   - nothing here trusts its data: every field may be null, an
 *     unknown style draws as a photo card and links go through
 *     `safeHref`.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { safeHref } from "@/services/safeHref";
import { pillarColorFromKey } from "@/lib/constants/pillarColors";
import { transformImageUrl } from "@/services/mediaOptimization";
import WorkTypeChip from "@/features/site/work/WorkTypeChip";
import { pillarName } from "@/features/site/work/workLabels";

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

const STYLES = new Set(["photo", "number", "dark", "quote"]);

/** A cover is usable only when it is a web address or a site path. */
const usableCover = (src: unknown): string => {
  if (typeof src !== "string") return "";
  const safe = safeHref(src);
  return /^(https?:\/\/|\/)/i.test(safe) ? safe : "";
};

const WorkCard = ({ item, style, proofApproved, className }: Props) => {
  const [coverFailed, setCoverFailed] = useState(false);
  const cover = coverFailed ? "" : usableCover(item.cover_image);
  const wanted = style || item.card_style || "photo";
  const known = STYLES.has(wanted) ? wanted : "photo";
  // A photo card with no cover becomes a number card (spec: never a
  // broken image).
  const resolved = known === "photo" && !cover ? "number" : known;
  const pillarColor = pillarColorFromKey(item.pillar);
  // A number linked to a proof point shows only while that proof is
  // approved; a typed metric (no link) always shows.
  const showMetric = Boolean(item.metric) && (!item.proof_point_id || proofApproved === true);

  const outside = item.link_out ? safeHref(item.link_out, "") : "";
  const href = outside || (item.has_case_study && item.slug ? `/work/${item.slug}/` : "");
  const isDark = resolved === "dark";
  const pillar = pillarName(item.pillar);
  const note = [item.role_title, item.honesty_label].filter(Boolean).join(" · ");
  // The big number sits above the title on a number card, so the foot
  // line carries only its label there.
  const footMetric = showMetric && resolved !== "number";
  const hasFoot = footMetric || Boolean(item.metric_label) || Boolean(note);

  const body = (
    <>
      {resolved === "photo" && cover && (
        <img
          src={transformImageUrl(cover, { width: 640, aspectRatio: 16 / 9, quality: 70 })}
          alt={item.cover_image_alt || ""}
          loading="lazy"
          decoding="async"
          onError={() => setCoverFailed(true)}
          className="work-card-cover"
        />
      )}
      <span className="work-card-body">
        <span className="work-card-meta">
          <WorkTypeChip type={item.type} />
          {pillar && (
            <span className="work-card-pillar">
              {pillarColor && <span aria-hidden className="work-dot" style={{ background: pillarColor }} />}
              {pillar}
            </span>
          )}
        </span>
        {resolved === "quote" && item.pull_line ? (
          <span className="work-card-quote">“{item.pull_line}”</span>
        ) : null}
        {resolved === "number" && showMetric ? <span className="work-card-number">{item.metric}</span> : null}
        {item.title && <span className="work-card-title line-clamp-3">{item.title}</span>}
        {item.summary ? <span className="work-card-summary line-clamp-3">{item.summary}</span> : <span className="flex-grow" />}
        {hasFoot && (
          <span className="work-card-foot">
            {footMetric && <span className="work-card-metric">{item.metric}</span>}
            <span className="work-card-note line-clamp-2">{item.metric_label || note}</span>
          </span>
        )}
      </span>
    </>
  );

  const cardClass = `work-card ${isDark ? "mc-card-dark" : "mc-card-glass"} ${href ? "mc-card-lift" : ""} ${className ?? ""}`;
  const cardStyle = pillarColor ? ({ ["--pillar" as string]: pillarColor } as React.CSSProperties) : undefined;

  if (!href) {
    return (
      <article className={cardClass} style={cardStyle} data-card-style={resolved}>
        {body}
      </article>
    );
  }
  if (outside) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cardClass} style={cardStyle} data-card-style={resolved}>
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
