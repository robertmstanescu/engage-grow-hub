/**
 * /work — the Work index.
 *
 * Hero, filter pills (pillar and type, built from the data), the card
 * grid in each item's own style, and a closing nudge to book a call.
 * Filter pills are real buttons with aria-pressed; the grid hides
 * itself behind one honest line when there is nothing published yet.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/features/site/Navbar";
import Footer from "@/features/site/Footer";
import usePageMeta from "@/hooks/usePageMeta";
import { fetchPublishedWorkItems, type WorkItemRecord } from "@/services/workItems";
import { fetchApprovedProofPoints } from "@/services/proofPoints";
import WorkCard, { type WorkCardItem } from "@/features/site/WorkCard";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";

type CardRecord = Pick<WorkItemRecord, "id" | "slug" | "type" | "pillar" | "title" | "summary" | "metric" | "metric_label" | "proof_point_id" | "card_style" | "pull_line" | "honesty_label" | "role_title" | "year" | "cover_image" | "cover_image_alt" | "link_out" | "has_case_study" | "sort_order" | "published_at">;

const PILLAR_NAMES: Record<string, string> = {
  ic: "Internal Communications",
  ex: "Employee Experience",
  ops: "People Operations",
  hrbp: "Fractional HRBP",
  pay: "Pay Transparency",
  mgr: "Manager Enablement",
};
const TYPE_NAMES: Record<string, string> = { case: "Case studies", artefact: "Artefacts", playbook: "Playbooks" };

const pillClass = (active: boolean) =>
  `inline-flex items-center gap-1.5 rounded-pill border px-4 min-h-[44px] font-body text-sm font-medium transition-colors ${
    active ? "bg-deep text-deep-foreground border-transparent" : "bg-transparent border-line-3 text-heading hover:bg-tint"
  }`;

const Work = () => {
  const [items, setItems] = useState<CardRecord[]>([]);
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [looked, setLooked] = useState(false);
  const [pillar, setPillar] = useState("");
  const [type, setType] = useState("");
  const { ref, isVisible } = useScrollReveal();

  usePageMeta({
    title: "Work",
    description: "Selected work from The Magic Coffin: case studies, artefacts and playbooks across the six service pillars.",
    canonicalPath: "/work/",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data }, { data: proofs }] = await Promise.all([fetchPublishedWorkItems(), fetchApprovedProofPoints()]);
      if (cancelled) return;
      setItems((data as CardRecord[]) ?? []);
      setApproved(new Set((proofs ?? []).map((p: { id: string }) => p.id)));
      setLooked(true);
    })().catch(() => {
      if (!cancelled) setLooked(true);
    });
    return () => { cancelled = true; };
  }, []);

  const pillarsPresent = useMemo(() => [...new Set(items.map((i) => i.pillar))], [items]);
  const typesPresent = useMemo(() => [...new Set(items.map((i) => i.type))], [items]);
  const visible = useMemo(
    () => items.filter((i) => (!pillar || i.pillar === pillar) && (!type || i.type === type)),
    [items, pillar, type],
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <section className="py-row-fluid">
          <div ref={ref as never} className="max-w-[1280px] mx-auto row-container">
            <span
              className="font-body uppercase block mb-rhythm-tight"
              style={{ fontSize: "var(--fs-eyebrow)", letterSpacing: "var(--ls-label, 0.28em)", color: "hsl(var(--gold-text))", ...revealStyle(isVisible, -0.5) }}
            >
              Work
            </span>
            <h1
              className="font-display font-extrabold mb-rhythm-base"
              style={{ fontSize: "var(--fs-h2)", lineHeight: "var(--lh-title, 1.05)", letterSpacing: "var(--ls-title, -0.015em)", color: "hsl(var(--heading))", ...revealStyle(isVisible, 0) }}
            >
              Proof, not promises.
            </h1>
            <p className="font-body measure" style={{ fontSize: "var(--fs-body)", lineHeight: "var(--lh-body, 1.6)", color: "hsl(var(--body))", ...revealStyle(isVisible, 0.2) }}>
              Case studies, artefacts and playbooks from real engagements — with the numbers we can stand behind.
            </p>

            {(pillarsPresent.length > 1 || typesPresent.length > 1) && (
              <div className="flex flex-wrap gap-2 mt-8" role="group" aria-label="Filter work">
                <button type="button" aria-pressed={pillar === ""} className={pillClass(pillar === "")} onClick={() => setPillar("")}>
                  All pillars
                </button>
                {pillarsPresent.map((p) => (
                  <button key={p} type="button" aria-pressed={pillar === p} className={pillClass(pillar === p)} onClick={() => setPillar(pillar === p ? "" : p)}>
                    {PILLAR_NAMES[p] ?? p}
                  </button>
                ))}
                <span aria-hidden className="w-px self-stretch bg-line-2 mx-1" />
                <button type="button" aria-pressed={type === ""} className={pillClass(type === "")} onClick={() => setType("")}>
                  All types
                </button>
                {typesPresent.map((t) => (
                  <button key={t} type="button" aria-pressed={type === t} className={pillClass(type === t)} onClick={() => setType(type === t ? "" : t)}>
                    {TYPE_NAMES[t] ?? t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="pb-row-fluid">
          <div className="max-w-[1280px] mx-auto row-container">
            {looked && visible.length === 0 ? (
              <p className="font-body" style={{ fontSize: "var(--fs-body)", color: "hsl(var(--body))" }}>
                {items.length === 0 ? "New work is on its way." : "Nothing matches those filters yet."}
              </p>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visible.map((item) => (
                  <li key={item.slug}>
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

        <section className="pb-row-fluid">
          <div className="max-w-[1280px] mx-auto row-container">
            <div className="mc-card-dark p-8 md:p-12 text-center">
              <h2 className="font-display font-extrabold mb-4" style={{ fontSize: "var(--fs-h3)", color: "hsl(var(--deep-fg))" }}>
                Want results like these?
              </h2>
              <p className="font-body measure mx-auto mb-6" style={{ fontSize: "var(--fs-body)", color: "hsl(var(--deep-fg) / 0.85)" }}>
                Book a discovery call and we will talk through what your organisation needs.
              </p>
              <Link
                to="/#contact"
                className="inline-flex items-center justify-center rounded-pill px-6 min-h-[44px] font-body font-semibold no-underline"
                style={{ background: "hsl(var(--gold))", color: "hsl(var(--deep))", fontSize: "var(--fs-card-body)" }}
              >
                Book a discovery call
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer breadcrumbTrail={[{ name: "Home", path: "/" }, { name: "Work" }]} />
    </div>
  );
};

export default Work;
