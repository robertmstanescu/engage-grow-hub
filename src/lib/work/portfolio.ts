/**
 * Work portfolio — the 21 pieces for /work, as data.
 *
 * Source: the owner's portfolio doc ("TMC · Website: work portfolio
 * template sheet") plus his confirmed career record. Nothing here talks
 * to Supabase: `scripts/work-portfolio/build-sql.ts` turns these entries
 * into SQL that Lovable runs, and every item lands as a DRAFT so the
 * owner reads each page in the admin before it goes public.
 *
 * Honesty rules (owner's, 11 Oct 2026, repeated 23 Nov 2026):
 *  - Never invent a metric, client or outcome. Only the six agreed proof
 *    points are numbers on the page (see PROOF_POINTS).
 *  - A step the owner has not confirmed is written as the most likely
 *    action and flagged `reconstructed: true`. Every flag, plus each
 *    entry's `questions`, is collected by `reviewList()` so he can
 *    confirm or correct it before publishing.
 *  - Playbooks carry "Illustrative example, not client work";
 *    recreations carry "Recreated with dummy data"; 17, 18 and 19 also
 *    say "not legal advice".
 *
 * This module is imported by scripts and tests only. It must stay out
 * of the public bundle (nothing under src/pages or src/features imports
 * it).
 */

export type Pillar = "ic" | "ex" | "ops" | "hrbp" | "pay" | "mgr";
export type WorkType = "case" | "artefact" | "playbook";
export type CardStyle = "photo" | "number" | "dark" | "quote";

/** The six agreed proof points (portfolio doc, Start tab). */
export const PROOF_POINTS = {
  countries: { label: "countries", value: "36", pillars: ["ic", "ex", "ops"], note: "South Pole, employees in 36 countries (2023 to 2026)." },
  people: { label: "people supported", value: "~500", pillars: ["ex", "ops", "hrbp"], note: "People supported across the employee lifecycle (agreed proof point, portfolio doc)." },
  hires: { label: "hires onboarded", value: "~300", pillars: ["ex"], note: "New hires through the redesigned Buddy Programme, Oct 2022 to Mar 2023 onwards." },
  attendance: { label: "live Town Hall attendance", value: "~60%", pillars: ["ic"], note: "Real attendees against headcount per time zone (APAC, EMEA, Americas)." },
  pageViews: { label: "intranet page views a year", value: "300K+", pillars: ["ic"], note: "Internal newsroom on LumApps, measured." },
  enps: { label: "eNPS participation in 2025", value: "70%+", pillars: ["ex"], note: "Every 2025 eNPS cycle, measured." },
} as const;
export type ProofKey = keyof typeof PROOF_POINTS;

/** A diagram drawn by scripts/work-portfolio/render-images.mjs. */
export type DiagramSpec =
  | { kind: "flow"; title: string; nodes: { label: string; note: string }[] }
  | { kind: "rag"; title: string; rows: { check: string; status: "red" | "amber" | "green"; note: string }[] }
  | { kind: "doc"; title: string; heading: string; blocks: { label: string; lines: string[] }[] };

export type Step = { title: string; text: string; reconstructed?: boolean };

export type Section =
  | { kind: "text"; eyebrow: string; title: string; paras: string[]; reconstructed?: boolean }
  | { kind: "steps"; eyebrow: string; title: string; steps: Step[] }
  | { kind: "diagram"; caption: string; alt: string }
  | { kind: "quote"; quote: string; name: string; role: string; avatar?: string; avatarAlt?: string; nameUrl?: string };

export interface PortfolioEntry {
  /** Number in the portfolio doc (01 to 21). */
  n: number;
  slug: string;
  type: WorkType;
  pillar: Pillar;
  title: string;
  summary: string;
  metaTitle: string;
  metaDescription: string;
  /** Plain facts for answer engines and llms.txt. */
  aiSummary: string;
  honestyLabel: string;
  roleTitle: string;
  year: string;
  tags: string[];
  cardStyle: CardStyle;
  metric?: string;
  metricLabel?: string;
  pullLine: string;
  /** Library photo (relative to the owner's Image library) and its crop. */
  cover: { source: string; alt: string; focusY?: number };
  diagram: DiagramSpec;
  proofs: ProofKey[];
  featuredHome: boolean;
  linkOut?: string;
  /** Slugs of the pieces this one links to in its copy. */
  related: string[];
  sections: Section[];
  faq: { q: string; a: string }[];
  /** What the owner still has to confirm or answer for this page. */
  questions: string[];
}

/* ── Paths of generated images (served from public/) ─────────────── */
export const coverPath = (slug: string) => `/work/${slug}/cover.webp`;
export const ogPath = (slug: string) => `/work/${slug}/og.jpg`;
export const diagramPath = (slug: string) => `/work/${slug}/diagram.webp`;

/* ── Row building (v1 rows; the site normalises them to v3) ──────── */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Copy is authored as plain text with [label](/path) links; this makes safe HTML. */
export const inlineHtml = (s: string) =>
  esc(s).replace(/\[([^\]]+)\]\((\/[a-z0-9\-/#]*)\)/g, (_m, label: string, href: string) => `<a href="${href}">${label}</a>`);
const paras = (list: string[]) => list.map((p) => `<p>${inlineHtml(p)}</p>`).join("");

type V1Row = {
  id: string;
  type: string;
  strip_title: string;
  bg_color: string;
  layout: Record<string, unknown>;
  content: Record<string, unknown>;
};

const row = (id: string, type: string, strip: string, content: Record<string, unknown>): V1Row => ({
  id,
  type,
  strip_title: strip,
  bg_color: "",
  layout: {},
  content,
});

/** The case body rows for one entry, in reading order. */
export const buildCaseRows = (e: PortfolioEntry): V1Row[] => {
  const out: V1Row[] = [];
  e.sections.forEach((s, i) => {
    const id = `work-${e.slug}-${i + 1}`;
    if (s.kind === "text") {
      out.push(row(id, "text", s.eyebrow, { eyebrow: s.eyebrow, title_lines: [esc(s.title)], body: paras(s.paras) }));
    } else if (s.kind === "steps") {
      out.push(
        row(id, "process_steps", s.eyebrow, {
          eyebrow: s.eyebrow,
          title_lines: [esc(s.title)],
          steps: s.steps.map((st) => ({ title: st.title, description: `<p>${inlineHtml(st.text)}</p>` })),
        }),
      );
    } else if (s.kind === "diagram") {
      out.push(row(id, "image", "Diagram", { url: diagramPath(e.slug), alt_text: s.alt, caption: s.caption }));
    } else if (s.kind === "quote") {
      out.push(
        row(id, "quote_band", "Quote", {
          quote: `<p>${esc(s.quote)}</p>`,
          name: s.name,
          role: s.role,
          ...(s.avatar ? { avatar: s.avatar, avatar_alt: s.avatarAlt || s.name } : {}),
          ...(s.nameUrl ? { name_url: s.nameUrl } : {}),
        }),
      );
    }
  });
  if (e.faq.length) {
    out.push(
      row(`work-${e.slug}-faq`, "faq", "Questions", {
        eyebrow: "Questions people ask",
        title_lines: ["Quick answers"],
        items: e.faq.map((f) => ({ question: f.q, answer: `<p>${inlineHtml(f.a)}</p>` })),
      }),
    );
  }
  return out;
};

/** Every reconstructed step and open question, grouped by entry. */
export const reviewList = (entries: PortfolioEntry[]) =>
  entries.map((e) => ({
    n: e.n,
    slug: e.slug,
    title: e.title,
    reconstructed: e.sections.flatMap((s) => {
      if (s.kind === "text" && s.reconstructed) return [`${s.title}: ${s.paras.join(" ")}`];
      if (s.kind === "steps") return s.steps.filter((st) => st.reconstructed).map((st) => `${st.title}: ${st.text}`);
      return [];
    }),
    questions: e.questions,
  }));

/** Every visible string of an entry, for the voice and length tests. */
export const visibleCopy = (e: PortfolioEntry): string[] => [
  e.title,
  e.summary,
  e.metaTitle,
  e.metaDescription,
  e.aiSummary,
  e.pullLine,
  e.cover.alt,
  ...e.sections.flatMap((s) => {
    if (s.kind === "text") return [s.eyebrow, s.title, ...s.paras];
    if (s.kind === "steps") return [s.eyebrow, s.title, ...s.steps.flatMap((st) => [st.title, st.text])];
    if (s.kind === "diagram") return [s.caption, s.alt];
    return [s.quote, s.name, s.role];
  }),
  ...e.faq.flatMap((f) => [f.q, f.a]),
];
