/**
 * /work/:slug — a case study (redesign: CaseStudy artboard).
 *
 * Top to bottom: a breadcrumb back to Work, the type chip with the
 * item's honesty label, the headline and summary, an "At a glance"
 * strip (role, timeframe, pillar and the item's APPROVED proof
 * points), the cover, then the case body: a sticky "On this page" list
 * beside one 760px reading column. Under 1024px the list folds into a
 * closed <details>. The page ends on the related service and a nudge
 * to book a call.
 *
 * The body is the item's rows through the normal row renderer, so
 * every row type works here; `.case-body` strips the rows' own padding
 * and the column supplies the spacing. Items without a case study
 * never link here; an unpublished slug shows the not-found page.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/features/site/Navbar";
import Footer from "@/features/site/Footer";
import NotFound from "@/pages/NotFound";
import usePageMeta from "@/hooks/usePageMeta";
import { fetchWorkItemBySlug, type WorkItemRecord } from "@/services/workItems";
import { fetchProofPointsByIds, type ProofPointRecord } from "@/services/proofPoints";
import { RowsRenderer } from "@/features/site/rows/PageRows";
import { normalizeRowsToV3 } from "@/lib/migrations/rowMigrations";
import { transformImageUrl } from "@/services/mediaOptimization";
import { pillarColorFromKey, PILLAR_KEY_TO_SLUG } from "@/lib/constants/pillarColors";
import { safeHref } from "@/services/safeHref";
import WorkTypeChip from "@/features/site/work/WorkTypeChip";
import { pillarName } from "@/features/site/work/workLabels";

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();
const two = (n: number) => String(n).padStart(2, "0");

/** Case rows as a clean list: malformed data and empty entries are dropped. */
const cleanRows = (rows: unknown): unknown[] =>
  Array.isArray(rows) ? rows.filter((r) => r && typeof r === "object") : [];

const WorkCase = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const [item, setItem] = useState<WorkItemRecord | null>(null);
  const [proofs, setProofs] = useState<ProofPointRecord[]>([]);
  const [looked, setLooked] = useState(false);
  const [current, setCurrent] = useState("");

  usePageMeta({
    title: item?.meta_title || item?.title || "Work",
    description: item?.meta_description || item?.summary || undefined,
    canonicalPath: `/work/${slug}/`,
    ogImage: item?.og_image || item?.cover_image || undefined,
  });

  useEffect(() => {
    let cancelled = false;
    setLooked(false);
    (async () => {
      const { data } = await fetchWorkItemBySlug(slug);
      if (cancelled) return;
      const record = (data as WorkItemRecord | null) ?? null;
      setItem(record);
      const ids = Array.isArray(record?.case_proof_ids) ? record.case_proof_ids.filter((id) => typeof id === "string") : [];
      if (ids.length) {
        const { data: pts } = await fetchProofPointsByIds(ids);
        // Only approved numbers reach the page, whatever the query returns.
        if (!cancelled) setProofs((Array.isArray(pts) ? (pts as ProofPointRecord[]) : []).filter((p) => p && p.approved === true));
      } else {
        setProofs([]);
      }
      if (!cancelled) setLooked(true);
    })().catch(() => {
      if (!cancelled) setLooked(true);
    });
    return () => { cancelled = true; };
  }, [slug]);

  const caseRows = useMemo(() => cleanRows(item?.case_rows), [item]);

  /* "On this page": one entry per case row that has a title (or, failing
     that, a small heading); clicking scrolls to the row's anchor. */
  const caseSections = useMemo(() => {
    const out: { id: string; label: string }[] = [];
    try {
      const v3 = normalizeRowsToV3(caseRows as Parameters<typeof normalizeRowsToV3>[0]);
      v3.forEach((row, i) => {
        for (const col of row?.columns ?? []) {
          for (const cell of col?.cells ?? []) {
            for (const w of cell?.widgets ?? []) {
              const data = (w?.data ?? {}) as { title_lines?: unknown; eyebrow?: unknown };
              const first = Array.isArray(data.title_lines) ? data.title_lines[0] : "";
              const raw = first || data.eyebrow;
              const label = raw ? stripHtml(String(raw)) : "";
              if (label) { out.push({ id: `case-s-${i}`, label }); return; }
            }
          }
        }
      });
    } catch {
      /* Rows that cannot be read get no index; the body still renders
         through the row renderer's own error boundary. */
    }
    return out;
  }, [caseRows]);
  const anchorFor = (_row: unknown, index: number) =>
    caseSections.some((s) => s.id === `case-s-${index}`) ? `case-s-${index}` : undefined;

  /* Mark the section being read in the index. Purely a visual aid: the
     links work without it, and it does nothing where the observer is
     missing. */
  useEffect(() => {
    if (caseSections.length < 2 || typeof IntersectionObserver === "undefined") return;
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting);
        const first = caseSections.find((s) => seen.get(s.id));
        if (first) setCurrent(first.id);
      },
      { rootMargin: "-20% 0px -55% 0px" },
    );
    for (const s of caseSections) {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [caseSections]);

  if (!looked) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="work-page">
          <div className="work-header">
            <div className="work-column animate-pulse space-y-4">
              <div className="h-4 w-40 rounded bg-tint" />
              <div className="h-10 w-3/4 rounded bg-tint" />
              <div className="h-4 w-full rounded bg-tint" />
            </div>
          </div>
        </main>
      </div>
    );
  }
  if (!item) return <NotFound />;

  const pillarColor = pillarColorFromKey(item.pillar);
  const pillar = pillarName(item.pillar);
  const serviceSlug = PILLAR_KEY_TO_SLUG[item.pillar];
  const cover = /^(https?:\/\/|\/)/i.test(safeHref(item.cover_image, "")) ? safeHref(item.cover_image, "") : "";
  const facts = [
    { name: "Role", text: item.role_title },
    { name: "Timeframe", text: item.year },
  ].filter((f) => f.text);
  const hasIndex = caseSections.length > 1;
  const indexLinks = caseSections.map((s, i) => (
    <a key={s.id} href={`#${s.id}`} aria-current={current === s.id ? "true" : undefined}>
      {two(i + 1)} {s.label}
    </a>
  ));

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="work-page">
        <header className="work-header case-header">
          <div className="work-column work-header-stack">
            <p className="case-crumb">
              <Link to="/work/">Work</Link>
              {pillar && (
                <>
                  <span aria-hidden>/</span>
                  <span className="work-card-pillar">
                    {pillarColor && <span aria-hidden className="work-dot" style={{ background: pillarColor }} />}
                    {pillar}
                  </span>
                </>
              )}
            </p>
            {(item.type || item.honesty_label) && (
              <p className="case-label">
                <WorkTypeChip type={item.type} />
                {item.honesty_label && <span>{item.honesty_label}</span>}
              </p>
            )}
            <h1 className="case-title">{item.title}</h1>
            {item.summary && <p className="work-lede">{item.summary}</p>}

            {(facts.length > 0 || pillar || proofs.length > 0) && (
              <dl className="case-glance" aria-label="At a glance">
                {facts.map((f) => (
                  <div key={f.name} className="mc-card-glass">
                    <dt>{f.name}</dt>
                    <dd>{f.text}</dd>
                  </div>
                ))}
                {pillar && (
                  <div className="mc-card-glass">
                    <dt>Pillar</dt>
                    <dd className="work-card-pillar">
                      {pillarColor && <span aria-hidden className="work-dot" style={{ background: pillarColor }} />}
                      {pillar}
                    </dd>
                  </div>
                )}
                {proofs.map((p) => (
                  <div key={p.id} className="mc-card-glass">
                    <dt>{p.label}</dt>
                    <dd className="case-glance-number">{p.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </header>

        {cover && (
          <div className="work-gutter">
            <img
              src={transformImageUrl(cover, { width: 1280, aspectRatio: 21 / 9, quality: 75 })}
              alt={item.cover_image_alt || ""}
              className="work-column case-cover"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          </div>
        )}

        {caseRows.length > 0 && (
          <section className="work-gutter case-body-section">
            <div className={`work-column ${hasIndex ? "case-layout" : ""}`}>
              {hasIndex && (
                <>
                  <aside className="case-index" aria-label="On this page">
                    <span className="case-index-name">On this page</span>
                    {indexLinks}
                  </aside>
                  <details className="case-index-fold mc-card-glass">
                    <summary>On this page</summary>
                    <nav aria-label="On this page">{indexLinks}</nav>
                  </details>
                </>
              )}
              <article className="case-body">
                <RowsRenderer rows={caseRows} promoteHeading={false} rowAnchorId={anchorFor} forceAlign="left" />
              </article>
            </div>
          </section>
        )}

        <section aria-labelledby="case-next" className="work-gutter case-next-section">
          <div className="work-column case-next">
            {pillar && serviceSlug && (
              <Link to={`/services/${serviceSlug}`} className="mc-card-glass mc-card-lift case-next-card">
                <span className="work-filter-name">Related service</span>
                <span className="case-next-service">{pillar}</span>
                <span className="case-next-link">
                  See the service <span aria-hidden>→</span>
                </span>
              </Link>
            )}
            <div className="mc-card-glass case-next-card">
              <h2 id="case-next" className="case-next-title">Facing something similar?</h2>
              <p className="work-count">Book a discovery call and we will talk it through.</p>
              <Link to="/#contact" className="case-next-button">
                Book a discovery call
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer breadcrumbTrail={[{ name: "Home", path: "/" }, { name: "Work", path: "/work/" }, { name: item.title }]} />
    </div>
  );
};

export default WorkCase;
