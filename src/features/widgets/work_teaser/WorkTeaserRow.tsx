/**
 * WorkTeaserRow — work cards as a proper row.
 *
 * A RowSection like every other row. Heading, mode, pillar, count and
 * link text come from the row's content; the items come from
 * `work_items` when the row renders. `auto` takes the newest published
 * items of the chosen pillar (or featured items when no pillar is
 * set); `picked` uses the row's own list in order, with any empty
 * override falling back to the item's field.
 *
 * With nothing to show the row paints nothing on the public site. In
 * the builder it paints a note instead: a row that renders nothing is
 * a zero-height, unclickable strip, so its settings could never be
 * opened — which is exactly when the owner needs to change what it
 * is asking for.
 */
import { parseContent } from "@/lib/parseContent";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { PageRow } from "@/types/rows";
import { supabase } from "@/integrations/supabase/client";
import { WORK_CARD_SELECT, type WorkItemRecord } from "@/services/workItems";
import { RowEyebrow, RowTitle, RowSection } from "@/features/site/rows/typography";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import { useBuilder } from "@/features/admin/builder/BuilderContext";
import WorkCard, { type WorkCardItem } from "@/features/site/WorkCard";
import { workTeaserSchema, type WorkTeaserContent } from "./schema";

type CardRecord = Pick<
  WorkItemRecord,
  | "id" | "slug" | "type" | "pillar" | "title" | "summary" | "metric" | "metric_label"
  | "proof_point_id" | "card_style" | "pull_line" | "honesty_label" | "role_title" | "year"
  | "cover_image" | "cover_image_alt" | "link_out" | "has_case_study" | "sort_order" | "published_at"
> & { featured_home?: boolean };

interface ResolvedCard {
  item: WorkCardItem;
  style: string;
  proofApproved?: boolean;
}

/** auto mode: pillar's newest, or featured items when no pillar is set. */
const pickAuto = (items: CardRecord[], c: WorkTeaserContent): CardRecord[] => {
  let pool = items;
  if (c.pillar) pool = pool.filter((i) => i.pillar === c.pillar);
  if (c.types.length) pool = pool.filter((i) => c.types.includes(i.type));
  if (!c.pillar) {
    const featured = pool.filter((i) => i.featured_home);
    if (featured.length) pool = featured;
  }
  return pool.slice(0, c.limit);
};

/** picked mode: the row's list in order, overrides applied (empty = item's). */
const pickPicked = (items: CardRecord[], c: WorkTeaserContent): ResolvedCard[] =>
  c.items
    .map((entry) => {
      const found = items.find((i) => i.id === entry.work_item_id);
      if (!found) return null;
      const o = entry.overrides || {};
      const item: WorkCardItem = {
        ...found,
        title: o.title || found.title,
        summary: o.summary || found.summary,
        metric: o.metric || found.metric,
        metric_label: o.metric_label || found.metric_label,
        pull_line: o.pull_line || found.pull_line,
        cover_image: o.hide_image ? "" : o.image || found.cover_image,
        cover_image_alt: o.image_alt || found.cover_image_alt,
      };
      return { item, style: entry.style || c.default_style };
    })
    .filter((x): x is ResolvedCard => Boolean(x))
    .slice(0, c.limit);

const WorkTeaserRow = ({ row }: { row: PageRow }) => {
  const c = parseContent(workTeaserSchema, row.content);
  const [cards, setCards] = useState<ResolvedCard[]>([]);
  const [looked, setLooked] = useState(false);
  const { enabled: builderEnabled } = useBuilder();
  const { ref, isVisible } = useScrollReveal();
  const pickedKey = c.items.map((i) => `${i.work_item_id}:${i.style}`).join("|");
  const queryKey = `${c.mode}|${c.pillar}|${c.types.join(",")}|${c.limit}|${c.default_style}|${pickedKey}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data }, { data: proofs }] = await Promise.all([
        supabase.from("work_items").select(WORK_CARD_SELECT + ", featured_home").eq("status", "published"),
        supabase.from("proof_points").select("id").eq("approved", true),
      ]);
      if (cancelled) return;
      const approved = new Set((proofs ?? []).map((p: { id: string }) => p.id));
      const items = (data ?? []) as unknown as CardRecord[];
      const resolved: ResolvedCard[] =
        c.mode === "picked"
          ? pickPicked(items, c)
          : pickAuto(items, c).map((item) => ({ item: item as WorkCardItem, style: c.default_style }));
      for (const card of resolved) {
        if (card.item.proof_point_id) card.proofApproved = approved.has(card.item.proof_point_id);
      }
      setCards(resolved);
      setLooked(true);
    })().catch(() => {
      if (!cancelled) setLooked(true);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  if (cards.length === 0) {
    if (!builderEnabled || !looked) return null;
    return (
      <RowSection row={row}>
        <div className="max-w-[1280px] mx-auto row-container">
          {c.title && <RowTitle color={c.color_title}><span className="block">{c.title}</span></RowTitle>}
          <p className="font-body text-sm mt-3" style={{ color: "hsl(var(--foreground) / 0.6)" }}>
            No published work item matches this block yet. It stays hidden on the live page until one does.
          </p>
        </div>
      </RowSection>
    );
  }

  return (
    <RowSection row={row}>
      <div ref={ref as never} className="max-w-[1280px] mx-auto row-container">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            {c.eyebrow && <RowEyebrow color={c.color_eyebrow} style={revealStyle(isVisible, -0.5)}>{c.eyebrow}</RowEyebrow>}
            {c.title && <RowTitle color={c.color_title} style={revealStyle(isVisible, 0)}><span className="block">{c.title}</span></RowTitle>}
          </div>
          {c.link_label && (
            <span style={revealStyle(isVisible, 0.2)}>
              <Link
                to="/work/"
                className="inline-flex items-center gap-2 font-body font-semibold no-underline"
                style={{ fontSize: "var(--fs-card-body)", color: "hsl(var(--link))" }}
              >
                {c.link_label} <span aria-hidden>→</span>
              </Link>
            </span>
          )}
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-5" style={revealStyle(isVisible, 0.3)}>
          {cards.map((card) => (
            <li key={card.item.slug}>
              <WorkCard item={card.item} style={card.style} proofApproved={card.proofApproved} />
            </li>
          ))}
        </ul>
      </div>
    </RowSection>
  );
};

export default WorkTeaserRow;
