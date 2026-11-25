/**
 * /work — the Work index (redesign: Work artboard).
 *
 * A headline with the three honesty labels explained, one glass panel
 * of filter pills (pillar and type, built from the data), the card
 * grid, and a dashed note when there is nothing to show. Filter pills
 * are real buttons with aria-pressed and the count is announced.
 *
 * The page stays off the navigation until the owner adds the link in
 * the admin (navbar data, not code).
 */
import { useEffect, useMemo, useState } from "react";
import Navbar from "@/features/site/Navbar";
import Footer from "@/features/site/Footer";
import usePageMeta from "@/hooks/usePageMeta";
import { fetchPublishedWorkItems, type WorkItemRecord } from "@/services/workItems";
import { fetchApprovedProofPoints } from "@/services/proofPoints";
import WorkCard, { type WorkCardItem } from "@/features/site/WorkCard";
import { WORK_CARD_SLOTS } from "@/features/site/work/workCardSlots";
import WorkTypeChip from "@/features/site/work/WorkTypeChip";
import WorkFeatured from "@/features/site/work/WorkFeatured";
import { useSiteContent } from "@/hooks/useSiteContent";
import { RowsRenderer } from "@/features/site/rows/PageRows";
import { WORK_PAGE_DEFAULTS, WORK_PAGE_KEY, readWorkPage } from "@/features/site/work/workPageContent";
import { PILLAR_NAMES, TYPE_PLURAL, TYPE_MEANING } from "@/features/site/work/workLabels";
import { pillarColorFromKey } from "@/lib/constants/pillarColors";

type CardRecord = Pick<WorkItemRecord, "id" | "slug" | "type" | "pillar" | "title" | "summary" | "metric" | "metric_label" | "proof_point_id" | "card_style" | "pull_line" | "honesty_label" | "role_title" | "year" | "cover_image" | "cover_image_alt" | "link_out" | "has_case_study" | "sort_order" | "published_at">;

/** Pillars and types print in the site's order, not the data's. */
const PILLAR_ORDER = Object.keys(PILLAR_NAMES);
const TYPE_ORDER = Object.keys(TYPE_PLURAL);

const Work = () => {
  const [items, setItems] = useState<CardRecord[]>([]);
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [looked, setLooked] = useState(false);
  const [pillar, setPillar] = useState("");
  const [type, setType] = useState("");

  // The header, plain answer, search fields and extra rows are edited
  // under Admin, Pages, Work (site content `work_page`).
  const page = readWorkPage(useSiteContent(WORK_PAGE_KEY, WORK_PAGE_DEFAULTS));

  usePageMeta({
    // Same fallback as the server copy (search plan US08); the brand is added once.
    title: page.meta_title || "Work: case studies and playbooks",
    description: page.meta_description || page.answer || page.header_subtitle || undefined,
    canonicalPath: "/work/",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data }, { data: proofs }] = await Promise.all([fetchPublishedWorkItems(), fetchApprovedProofPoints()]);
      if (cancelled) return;
      // Rows without a slug cannot be keyed or linked: leave them out.
      setItems(Array.isArray(data) ? (data as CardRecord[]).filter((i) => i && typeof i.slug === "string" && i.slug) : []);
      setApproved(new Set((Array.isArray(proofs) ? proofs : []).map((p: { id: string }) => p.id)));
      setLooked(true);
    })().catch(() => {
      if (!cancelled) setLooked(true);
    });
    return () => { cancelled = true; };
  }, []);

  // Only known pillars and types become pills; anything else still shows under "All".
  const pillarsPresent = useMemo(() => PILLAR_ORDER.filter((p) => items.some((i) => i.pillar === p)), [items]);
  const typesPresent = useMemo(() => TYPE_ORDER.filter((t) => items.some((i) => i.type === t)), [items]);
  // The top three, in the owner's order; a slug that is not published is skipped.
  const featured = useMemo(
    () => page.featured_slugs.map((s) => items.find((i) => i.slug === s)).filter((i): i is CardRecord => Boolean(i)),
    [items, page.featured_slugs],
  );
  const visible = useMemo(
    () => items.filter((i) => (!pillar || i.pillar === pillar) && (!type || i.type === type)),
    [items, pillar, type],
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="work-page">
        <header className="work-header">
          <div className="work-column work-header-stack">
            {page.header_label && <p className="work-eyebrow">{page.header_label}</p>}
            {/* No hand-drawn underline: the owner calls title underlines a tell. */}
            <h1 className="work-title">{page.header_title}</h1>
            {page.header_subtitle && <p className="work-lede">{page.header_subtitle}</p>}
            <ul className="work-legend">
              {TYPE_ORDER.map((t) => (
                <li key={t}>
                  <WorkTypeChip type={t} />
                  <span>{TYPE_MEANING[t]}</span>
                </li>
              ))}
            </ul>
          </div>
        </header>

        {featured.length > 0 && (
          <WorkFeatured items={featured as WorkCardItem[]} label={page.featured_label} approved={approved} />
        )}

        {page.rows_above.length > 0 && <RowsRenderer rows={page.rows_above} promoteHeading={false} />}

        {items.length > 0 && (
          <section aria-label="Filter the work" className="work-gutter">
            <div className="work-column work-filter mc-card-glass">
              {pillarsPresent.length > 0 && (
                <div className="work-filter-row" role="group" aria-label="Pillar">
                  <span className="work-filter-name">Pillar</span>
                  <button type="button" aria-pressed={pillar === ""} className="work-pill" onClick={() => setPillar("")}>
                    All
                  </button>
                  {pillarsPresent.map((p) => (
                    <button key={p} type="button" aria-pressed={pillar === p} className="work-pill" onClick={() => setPillar(pillar === p ? "" : p)}>
                      <span aria-hidden className="work-dot" style={{ background: pillarColorFromKey(p) }} />
                      {PILLAR_NAMES[p]}
                    </button>
                  ))}
                </div>
              )}
              {typesPresent.length > 0 && (
                <div className="work-filter-row" role="group" aria-label="Type">
                  <span className="work-filter-name">Type</span>
                  <button type="button" aria-pressed={type === ""} className="work-pill" onClick={() => setType("")}>
                    All
                  </button>
                  {typesPresent.map((t) => (
                    <button key={t} type="button" aria-pressed={type === t} className="work-pill" onClick={() => setType(type === t ? "" : t)}>
                      {TYPE_PLURAL[t]}
                    </button>
                  ))}
                </div>
              )}
              <p aria-live="polite" className="work-count">
                Showing {visible.length} {visible.length === 1 ? "piece" : "pieces"}
              </p>
            </div>
          </section>
        )}

        <section aria-label="Work" className="work-gutter work-grid-section">
          <div className="work-column">
            {looked && visible.length === 0 ? (
              <div className="work-empty">
                <strong>{items.length === 0 ? "New work is on its way." : "More from this crypt soon."}</strong>
                <span>
                  {items.length === 0
                    ? "Book a call and ask about it directly."
                    : "Try another pillar, or book a call and ask about it directly."}
                </span>
              </div>
            ) : (
              <ul className="work-grid align-cards">
                {visible.map((item) => (
                  <li key={item.slug} className="align-card" style={WORK_CARD_SLOTS}>
                    <WorkCard
                      item={item as WorkCardItem}
                      proofApproved={item.proof_point_id ? approved.has(item.proof_point_id) : undefined}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
        {page.rows_below.length > 0 && <RowsRenderer rows={page.rows_below} promoteHeading={false} />}
      </main>
      <Footer breadcrumbTrail={[{ name: "Home", path: "/" }, { name: "Work" }]} pageAnswer={page.answer} />
    </div>
  );
};

export default Work;
