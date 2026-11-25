/**
 * WorkFeatured — the self-scrolling "top three" band under the /work
 * header (owner, 25 Nov 2026: "a hero widget too with like the best top
 * 3 … that like scrolls by itself").
 *
 * One wide glass card at a time: the 16:9 picture on one side, the type
 * chip, service, title, summary and result on the other. It moves on by
 * itself every few seconds and stops while a visitor points at it or
 * tabs into it, when the tab is hidden, or for good once they press
 * Pause or pick a slide (WCAG 2.2.2). With "reduce motion" switched on
 * it never moves by itself. Slides that are not showing are `inert`, so
 * Tab and screen readers only meet the one on screen.
 *
 * Data rules match the cards: only published items reach it (the page
 * passes them in), a number tied to an unapproved proof point is hidden,
 * links go through `safeHref`, and a missing or broken picture leaves
 * the text side on its own.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { safeHref } from "@/services/safeHref";
import { transformImageUrl } from "@/services/mediaOptimization";
import { pillarColorFromKey } from "@/lib/constants/pillarColors";
import WorkTypeChip from "@/features/site/work/WorkTypeChip";
import { pillarName } from "@/features/site/work/workLabels";
import type { WorkCardItem } from "@/features/site/WorkCard";

/** Time each slide stays up before the band moves on by itself. */
export const FEATURED_INTERVAL_MS = 6500;

interface Props {
  items: WorkCardItem[];
  label?: string;
  /** Proof point ids that are approved (numbers tied to others stay hidden). */
  approved: Set<string>;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const hrefFor = (item: WorkCardItem) => {
  const outside = item.link_out ? safeHref(item.link_out, "") : "";
  return { outside, href: outside || (item.has_case_study && item.slug ? `/work/${item.slug}/` : "") };
};

const Slide = ({ item, approved, index, total, active }: { item: WorkCardItem; approved: Set<string>; index: number; total: number; active: boolean }) => {
  const [coverFailed, setCoverFailed] = useState(false);
  const cover = !coverFailed && typeof item.cover_image === "string" && /^(https?:\/\/|\/)/i.test(safeHref(item.cover_image)) ? safeHref(item.cover_image) : "";
  const showMetric = Boolean(item.metric) && (!item.proof_point_id || approved.has(item.proof_point_id));
  const { outside, href } = hrefFor(item);
  const pillar = pillarName(item.pillar);
  const color = pillarColorFromKey(item.pillar);
  const linkLabel = outside ? "See the work" : "Read the case";

  return (
    <div
      className="work-featured-slide"
      data-active={active ? "true" : "false"}
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${total}: ${item.title}`}
      // React 18 types lack `inert`; an empty string switches it on.
      {...({ inert: active ? undefined : "" } as Record<string, unknown>)}
    >
      {cover ? (
        <img
          src={transformImageUrl(cover, { width: 1200, aspectRatio: 16 / 9, quality: 75 })}
          alt={item.cover_image_alt || ""}
          loading={index === 0 ? "eager" : "lazy"}
          decoding="async"
          onError={() => setCoverFailed(true)}
          className="work-featured-cover"
        />
      ) : (
        <span aria-hidden className="work-featured-cover work-featured-cover-empty" />
      )}
      <div className="work-featured-text">
        <span className="work-card-meta">
          <WorkTypeChip type={item.type} />
          {pillar && (
            <span className="work-card-pillar">
              {color && <span aria-hidden className="work-dot" style={{ background: color }} />}
              {pillar}
            </span>
          )}
        </span>
        <h2 className="work-featured-title">{item.title}</h2>
        {item.summary && <p className="work-featured-summary">{item.summary}</p>}
        {(showMetric || item.metric_label) && (
          <p className="work-featured-result">
            {showMetric && <span className="work-featured-metric">{item.metric}</span>}
            {item.metric_label && <span>{item.metric_label}</span>}
          </p>
        )}
        {href &&
          (outside ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className="btn-ink work-featured-link">
              {linkLabel} <span aria-hidden>→</span>
            </a>
          ) : (
            <Link to={href} className="btn-ink work-featured-link">
              {linkLabel} <span aria-hidden>→</span>
            </Link>
          ))}
      </div>
    </div>
  );
};

const WorkFeatured = ({ items, label, approved }: Props) => {
  const total = items.length;
  const [current, setCurrent] = useState(0);
  // `stopped`: the visitor pressed Pause or picked a slide; it stays still until Play.
  const [stopped, setStopped] = useState(() => prefersReducedMotion());
  // `held`: pointer over it, focus inside it or the tab hidden; it moves on again after.
  const [held, setHeld] = useState(false);
  const [hidden, setHidden] = useState(false);
  const rootRef = useRef<HTMLElement>(null);

  const running = total > 1 && !stopped && !held && !hidden;

  useEffect(() => {
    if (current >= total) setCurrent(0);
  }, [current, total]);

  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => setCurrent((i) => (i + 1) % total), FEATURED_INTERVAL_MS);
    return () => window.clearTimeout(id);
  }, [running, current, total]);

  useEffect(() => {
    const onVisibility = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const go = useCallback(
    (i: number) => {
      setStopped(true);
      setCurrent(((i % total) + total) % total);
    },
    [total],
  );

  if (total === 0) return null;

  return (
    <section
      ref={rootRef}
      className="work-gutter work-featured-section"
      aria-roledescription="carousel"
      aria-label={label || "Featured work"}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node | null)) setHeld(false);
      }}
      onKeyDown={(e) => {
        if (total < 2) return;
        if (e.key === "ArrowRight") go(current + 1);
        else if (e.key === "ArrowLeft") go(current - 1);
      }}
    >
      <div className="work-column" style={{ ["--featured-ms" as string]: `${FEATURED_INTERVAL_MS}ms` }}>
        {label && <p className="work-eyebrow work-featured-label">{label}</p>}
        <div className="work-featured mc-card-glass">
          {/* Polite announcements only while it is still, so it never talks over a visitor. */}
          <div className="work-featured-track" aria-live={running ? "off" : "polite"}>
            {items.map((item, i) => (
              <Slide key={item.slug} item={item} approved={approved} index={i} total={total} active={i === current} />
            ))}
          </div>
        </div>
        {total > 1 && (
          <div className="work-featured-controls">
            <div className="work-featured-dots" role="group" aria-label="Choose a piece">
              {items.map((item, i) => (
                <button
                  key={item.slug}
                  type="button"
                  className="work-featured-dot"
                  aria-label={`Show ${i + 1} of ${total}: ${item.title}`}
                  aria-current={i === current ? "true" : undefined}
                  data-running={i === current && running ? "true" : "false"}
                  onClick={() => go(i)}
                >
                  <span aria-hidden className="work-featured-dot-fill" />
                </button>
              ))}
            </div>
            <button
              type="button"
              className="work-featured-pause"
              aria-label={stopped ? "Play the slides" : "Pause the slides"}
              onClick={() => setStopped((s) => !s)}
            >
              <span aria-hidden>{stopped ? "▶" : "❚❚"}</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default WorkFeatured;
