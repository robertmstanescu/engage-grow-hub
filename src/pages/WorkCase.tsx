/**
 * /work/:slug — a case study.
 *
 * Hero (eyebrow = pillar · type, H1 = the item's title, summary), the
 * cover, an "At a glance" strip built from the item's approved proof
 * points, the case body as rows through the normal row renderer, and
 * a closing nudge to book a call. Items without a case study never
 * link here; an unpublished slug 404s.
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
import { pillarColorFromKey } from "@/lib/constants/pillarColors";

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();

const PILLAR_NAMES: Record<string, string> = {
  ic: "Internal Communications",
  ex: "Employee Experience",
  ops: "People Operations",
  hrbp: "Fractional HRBP",
  pay: "Pay Transparency",
  mgr: "Manager Enablement",
};
const TYPE_NAMES: Record<string, string> = { case: "Case study", artefact: "Artefact", playbook: "Playbook" };

const WorkCase = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const [item, setItem] = useState<WorkItemRecord | null>(null);
  const [proofs, setProofs] = useState<ProofPointRecord[]>([]);
  const [looked, setLooked] = useState(false);

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
      if (record?.case_proof_ids?.length) {
        const { data: pts } = await fetchProofPointsByIds(record.case_proof_ids);
        if (!cancelled) setProofs(((pts as ProofPointRecord[]) ?? []).filter((p) => p.approved));
      } else {
        setProofs([]);
      }
      if (!cancelled) setLooked(true);
    })().catch(() => {
      if (!cancelled) setLooked(true);
    });
    return () => { cancelled = true; };
  }, [slug]);

  const caseRows = useMemo(
    () => (item && Array.isArray(item.case_rows) ? item.case_rows : []),
    [item],
  );

  /* "On this page" (redesign §6 E4): one entry per case row that has a
     title or eyebrow; clicking scrolls to the row's anchor. */
  const caseSections = useMemo(() => {
    const v3 = normalizeRowsToV3(caseRows as Parameters<typeof normalizeRowsToV3>[0]);
    const out: { id: string; label: string }[] = [];
    v3.forEach((row, i) => {
      for (const col of row.columns ?? []) {
        for (const cell of col.cells ?? []) {
          for (const w of cell.widgets ?? []) {
            const data = (w.data ?? {}) as { title_lines?: string[]; eyebrow?: string };
            const raw = data.title_lines?.[0] || data.eyebrow;
            const label = raw ? stripHtml(String(raw)) : "";
            if (label) { out.push({ id: `case-s-${i}`, label }); return; }
          }
        }
      }
    });
    return out;
  }, [caseRows]);
  const anchorFor = (_row: unknown, index: number) =>
    caseSections.some((s) => s.id === `case-s-${index}`) ? `case-s-${index}` : undefined;

  if (!looked) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="py-row-fluid">
          <div className="max-w-[820px] mx-auto row-container">
            <div className="animate-pulse space-y-4">
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
  const eyebrow = [PILLAR_NAMES[item.pillar] ?? item.pillar, TYPE_NAMES[item.type] ?? item.type, item.year].filter(Boolean).join(" · ");
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <section className="py-row-fluid">
          <div className="max-w-[820px] mx-auto row-container">
            <span
              className="flex items-center gap-2 font-body uppercase mb-rhythm-tight"
              style={{ fontSize: "var(--fs-eyebrow)", letterSpacing: "var(--ls-label, 0.28em)", color: "hsl(var(--gold-text))" }}
            >
              {pillarColor && <span aria-hidden className="inline-block w-2 h-2 rounded-full" style={{ background: pillarColor }} />}
              {eyebrow}
            </span>
            <h1
              className="font-display font-extrabold mb-rhythm-base"
              style={{ fontSize: "var(--fs-h2)", lineHeight: "var(--lh-title, 1.05)", letterSpacing: "var(--ls-title, -0.015em)", color: "hsl(var(--heading))" }}
            >
              {item.title}
            </h1>
            {item.summary && (
              <p className="font-body measure" style={{ fontSize: "var(--fs-subtitle)", lineHeight: "var(--lh-subtitle, 1.45)", color: "hsl(var(--body))" }}>
                {item.summary}
              </p>
            )}
            {(item.role_title || item.honesty_label) && (
              <p className="font-body mt-4" style={{ fontSize: "var(--fs-card-label)", color: "hsl(var(--meta))" }}>
                {[item.role_title, item.honesty_label].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </section>

        {item.cover_image && (
          <section className="pb-row-fluid">
            <div className="max-w-[1100px] mx-auto row-container">
              <img
                src={transformImageUrl(item.cover_image, { width: 1100, aspectRatio: 21 / 9, quality: 75 })}
                alt={item.cover_image_alt || ""}
                className="w-full object-cover rounded-card"
                style={{ aspectRatio: "21 / 9" }}
              />
            </div>
          </section>
        )}

        {proofs.length > 0 && (
          <section className="pb-row-fluid" aria-label="At a glance">
            <div className="max-w-[1100px] mx-auto row-container">
              <div className="mc-card p-6 md:p-8">
                <span className="font-body uppercase block mb-4" style={{ fontSize: "var(--fs-card-label)", letterSpacing: "var(--ls-label, 0.28em)", color: "hsl(var(--gold-text))" }}>
                  At a glance
                </span>
                <ul className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {proofs.map((p) => (
                    <li key={p.id}>
                      <span className="block font-display font-extrabold" style={{ fontSize: "var(--fs-stat)", lineHeight: 1, color: "hsl(var(--heading))" }}>
                        {p.value}
                      </span>
                      <span className="block font-body mt-1" style={{ fontSize: "var(--fs-card-body)", color: "hsl(var(--body))" }}>
                        {p.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {caseRows.length > 0 && (
          <div className={caseSections.length > 1 ? "xl:grid xl:grid-cols-[240px_minmax(0,1fr)] xl:gap-10 max-w-[1280px] mx-auto" : ""}>
            {caseSections.length > 1 && (
              <aside className="hidden xl:block" aria-label="On this page">
                <nav className="sticky top-32">
                  <span className="font-body uppercase block mb-3" style={{ fontSize: "var(--fs-card-label)", letterSpacing: "var(--ls-label, 0.28em)", color: "hsl(var(--meta))" }}>
                    On this page
                  </span>
                  <ul className="space-y-2">
                    {caseSections.map((s) => (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          className="font-body no-underline transition-colors hover:opacity-100"
                          style={{ fontSize: "var(--fs-card-body)", color: "hsl(var(--body) / 0.75)" }}
                        >
                          {s.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </aside>
            )}
            <div className="min-w-0">
              <RowsRenderer rows={caseRows} promoteHeading={false} rowAnchorId={anchorFor} />
            </div>
          </div>
        )}

        <section className="py-row-fluid">
          <div className="max-w-[820px] mx-auto row-container text-center">
            <h2 className="font-display font-extrabold mb-4" style={{ fontSize: "var(--fs-h3)", color: "hsl(var(--heading))" }}>
              Facing something similar?
            </h2>
            <p className="font-body measure mx-auto mb-6" style={{ fontSize: "var(--fs-body)", color: "hsl(var(--body))" }}>
              Book a discovery call and we will talk it through.
            </p>
            <Link
              to="/#contact"
              className="inline-flex items-center justify-center rounded-pill px-6 min-h-[44px] font-body font-semibold no-underline"
              style={{ background: "hsl(var(--deep))", color: "hsl(var(--deep-fg))", fontSize: "var(--fs-card-body)" }}
            >
              Book a discovery call
            </Link>
          </div>
        </section>
      </main>
      <Footer breadcrumbTrail={[{ name: "Home", path: "/" }, { name: "Work", path: "/work/" }, { name: item.title }]} />
    </div>
  );
};

export default WorkCase;
