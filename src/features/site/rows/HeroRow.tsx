import type { PageRow } from "@/types/rows";
import { safeHref } from "@/services/safeHref";
import { HeroView } from "@/features/site/HeroSection";
import Icon from "@/features/icons/Icon";

interface Props {
  row: PageRow;
}

/**
 * <HeroRow/> — the CMS "Hero" row.
 *
 * It renders the SAME view as the homepage hero (`<HeroView/>`) so every
 * page's hero shares one layout, type scale and entrance animation.
 * Inline editing is disabled here: a CMS row's copy is edited in the page
 * builder, not through the site_content "hero" section.
 *
 * The row's surface (background colour, edge shapes, radius, outline,
 * height) is painted by RowSection — RowRenderer wraps every hero row
 * in one, so this component deliberately passes no sectionStyle of its
 * own. HeroView detects the surrounding surface (useInsideRowSurface)
 * and drops its own padding/height compensation.
 */
const HeroRow = ({ row }: Props) => {
  const c = row.content || {};

  /* "In short" strip (redesign, service pages): the page's plain answer
     in a glass strip under the hero. Off unless the hero turns it on
     (`answer_strip`); the footer keeps showing the same answer. */
  const answer = typeof c.answer === "string" ? c.answer.trim() : "";
  const strip = c.answer_strip && answer ? (
    <div className="relative z-10 w-full max-w-[1280px] mx-auto row-container" style={{ marginTop: 6, paddingBottom: "clamp(24px, 3vw, 40px)" }}>
      {/* Artboard ServiceIC, "In short": a 12-column glass strip, the
          label on two columns, the answer on ten, the pillar colour down
          the left edge. Stacks on a phone. */}
      <div
        className="surface-card grid grid-cols-1 md:grid-cols-12 items-start"
        style={{ gap: 24, padding: "clamp(24px, 3vw, 36px) clamp(24px, 4vw, 48px)", borderLeft: `4px solid ${c.color_label || "hsl(var(--deep))"}` }}
        data-answer-strip
      >
        <p className="font-body font-bold uppercase md:col-span-2" style={{ color: "hsl(var(--gold-text))", fontSize: "var(--fs-chip)", letterSpacing: "0.24em", paddingTop: 6 }}>
          In short
        </p>
        <p className="font-body md:col-span-10" style={{ color: "hsl(var(--foreground))", fontSize: "var(--fs-hero-body)", lineHeight: 1.6 }}>
          {answer}
        </p>
      </div>
    </div>
  ) : null;

  return (
    <>
    <HeroView
      editable={false}
      content={c as any}
      leading={
        c.icon ? (
          <div style={{ color: "hsl(var(--hero-title))" }}>
            <Icon value={c.icon} size={48} />
          </div>
        ) : null
      }
      trailing={
        c.cta_url && c.cta_label ? (
          <a
            href={safeHref(c.cta_url)}
            target={c.cta_url.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="btn-ink btn-lg"
          >
            {c.cta_label}
          </a>
        ) : null
      }
    />
    {strip}
    </>
  );
};

export default HeroRow;
