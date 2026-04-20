/**
 * ─────────────────────────────────────────────────────────────────────────
 * SeoMaster.tsx — Centralized SEO control surface
 * ─────────────────────────────────────────────────────────────────────────
 *
 * WHAT THIS IS (for the junior engineer)
 * ──────────────────────────────────────
 * One screen that gives admins god-mode visibility over every SEO-critical
 * field on the site, plus a single place to edit the global metadata that
 * applies to ALL pages (custom <head> scripts, JSON-LD organization schema,
 * social-share prefix).
 *
 * It splits into TWO sub-views, toggled by a tab strip:
 *
 *   1. HEADINGS AUDIT
 *      ─────────────────────
 *      Pulls every blog post and CMS page from the database and walks
 *      their JSON content to surface H1 candidates (`title_lines`) and
 *      H2 candidates (`subtitle`). Displays them in a flat table so you
 *      can spot duplicate H1s, missing H2s, or pages with weak headlines
 *      at a glance.
 *
 *      EXTRACTION STRATEGY (per the user's choice):
 *      We only read DOCUMENTED fields — `content.title_lines` and
 *      `content.subtitle` — not every string in the JSON. This keeps
 *      the audit signal-to-noise high. If you add a new row type that
 *      stores its headline in a different key, update `extractHeadings`
 *      below.
 *
 *      Per-row meta_title is editable inline. On blur, the change is
 *      pushed straight into the source-of-truth table (cms_pages or
 *      blog_posts) via the existing service functions —
 *      `updateCmsPageMeta` and `updateBlogPost`. This is the
 *      "bi-directional sync" the spec asks for: edits made here surface
 *      in the regular per-page editor and vice versa, because both
 *      target the same column.
 *
 *   2. GLOBAL METADATA (Atypical Tags)
 *      ─────────────────────────────────
 *      Three free-text fields persisted to a single row in the
 *      `site_content` table under the new section_key
 *      `global_seo_tags`. Field shape:
 *
 *        {
 *          custom_head_scripts: string,    // raw HTML/JS pasted into <head>
 *          json_ld_organization: string,   // JSON-LD blob (validated as JSON)
 *          social_prefix: string,          // og:title / twitter:title prefix
 *        }
 *
 *      We use the standard publishSection helper so the values land in
 *      both `content` and `draft_content` immediately (no draft/publish
 *      cycle needed for global meta — the cost of getting it wrong is
 *      tiny and admins want the change to take effect right away).
 *
 *      Wiring these values into actual <head> tags is the responsibility
 *      of `usePageMeta` / index.html — this file only persists them.
 *
 * WHY ONE COMPONENT INSTEAD OF TWO ROUTES?
 * ────────────────────────────────────────
 * The dashboard's "CONFIGURE" group is meant to host single-tab admin
 * tools. Splitting headings audit and global tags into two sidebar items
 * would dilute discoverability — both are "SEO settings" in the user's
 * mental model. The internal tab strip below keeps them grouped while
 * preserving distinct UI surfaces.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import { Loader2, Search, Globe, Code2, Sparkles, AlertCircle, ExternalLink, ChevronDown, ChevronRight, Plus, Trash2, BarChart3, Building2 } from "lucide-react";
import { fetchAllCmsPages, updateCmsPageMeta } from "@/services/cmsPages";
import { fetchAllBlogPosts, updateBlogPost } from "@/services/blogPosts";
import { fetchSection, publishSection } from "@/services/siteContent";
import { runDbAction } from "@/services/db-helpers";
import { invalidateSiteContent } from "@/hooks/useSiteContent";

/* ═════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */

type TabKey = "headings" | "global";

/** A flat row in the headings audit table. */
interface HeadingRow {
  source: "cms_page" | "blog_post";
  id: string;
  pageTitle: string;
  slug: string;
  metaTitle: string;
  /** Detected H1 strings (one per `title_lines` entry). */
  h1s: string[];
  /** Detected H2 string (`subtitle`). */
  h2s: string[];
  editPath?: string;
}

/**
 * Global SEO tags shape.
 *
 * Templated fields (NEW)
 * ──────────────────────
 *   tracking.ga4              — Google Analytics 4 measurement ID (G-XXXXX)
 *   tracking.meta_pixel       — Meta (Facebook) Pixel ID (numeric)
 *   tracking.linkedin_partner — LinkedIn Insight Tag Partner ID
 *   organization.legal_name   — Legal entity name (used in JSON-LD)
 *   organization.type         — Schema.org Organization subtype
 *   organization.social_links — Array of profile URLs (sameAs in JSON-LD)
 *
 * Free-text legacy fields (preserved)
 * ───────────────────────────────────
 *   custom_head_scripts       — Raw <head> escape hatch (advanced users only)
 *   json_ld_organization      — Raw JSON-LD override (rare; usually auto-built)
 *   social_prefix             — og:title / twitter:title prefix
 */
interface GlobalSeoTags {
  custom_head_scripts: string;
  json_ld_organization: string;
  social_prefix: string;
  tracking: {
    ga4: string;
    meta_pixel: string;
    linkedin_partner: string;
  };
  organization: {
    legal_name: string;
    type: string;
    social_links: string[];
  };
}

const EMPTY_GLOBAL: GlobalSeoTags = {
  custom_head_scripts: "",
  json_ld_organization: "",
  social_prefix: "",
  tracking: { ga4: "", meta_pixel: "", linkedin_partner: "" },
  organization: { legal_name: "", type: "Organization", social_links: [] },
};

/** Schema.org Organization subtypes — covers most business shapes. */
const ORG_TYPES = [
  "Organization",
  "Corporation",
  "LocalBusiness",
  "EducationalOrganization",
  "GovernmentOrganization",
  "NGO",
  "NewsMediaOrganization",
  "PerformingGroup",
  "SportsOrganization",
] as const;

const GLOBAL_SEO_KEY = "global_seo_tags";

/* ═════════════════════════════════════════════════════════════════════
   HEADING EXTRACTION HELPERS
   ─────────────────────────────────────────────────────────────────────
   Row content is a free-form JSON blob. We only look at known fields
   (per the user's chosen extraction strategy) so the audit stays
   predictable and noise-free.
   ═════════════════════════════════════════════════════════════════════ */

/** Strip HTML tags from a rich-text string for plain-text display. */
const stripHtml = (input: unknown): string => {
  if (typeof input !== "string") return "";
  return input.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
};

/**
 * Pull plain-text strings out of a `title_lines` array.
 * Entries may be HTML strings, plain strings, or `{text, type}` objects.
 */
const titleLinesToStrings = (content: unknown): string[] => {
  if (!content || typeof content !== "object") return [];
  const c = content as Record<string, any>;
  if (!Array.isArray(c.title_lines)) return [];
  const out: string[] = [];
  for (const line of c.title_lines) {
    const raw = typeof line === "string" ? line : line?.text ?? "";
    const text = stripHtml(raw);
    if (text) out.push(text);
  }
  return out;
};

/**
 * Walk all rows on a page and produce a clean H1/H2 split.
 *
 * SEO HIERARCHY RULE (the #1 technical SEO requirement):
 *   • Exactly one H1 per page — the hero's `title_lines`.
 *   • H2s = `title_lines` of every OTHER row.
 *   • The hero's `tagline` is NOT a heading (it renders as <p>) so
 *     it is deliberately excluded from this audit.
 *   • Per-row `subtitle` strings are stylised paragraphs in the live
 *     site, so they are excluded too — auditing them would create
 *     false-positive "H2" entries.
 */
const extractHeadings = (rows: any): { h1s: string[]; h2s: string[] } => {
  const acc = { h1s: [] as string[], h2s: [] as string[] };
  if (!Array.isArray(rows)) return acc;

  // First hero row owns the H1. Everything else contributes H2s.
  const heroIdx = rows.findIndex((r: any) => r?.row_type === "hero");

  rows.forEach((row: any, i: number) => {
    const lines = titleLinesToStrings(row?.content);
    if (!lines.length) return;
    if (i === heroIdx) {
      acc.h1s.push(...lines);
    } else {
      acc.h2s.push(...lines);
    }
  });

  // Fallback: page has no hero row → first row with title_lines becomes H1.
  if (heroIdx === -1 && acc.h1s.length === 0 && acc.h2s.length > 0) {
    acc.h1s.push(acc.h2s.shift()!);
  }

  return acc;
};

/* ═════════════════════════════════════════════════════════════════════
   COMPONENT
   ═════════════════════════════════════════════════════════════════════ */

const SeoMaster = () => {
  const [tab, setTab] = useState<TabKey>("headings");

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl text-foreground flex items-center gap-2">
          <Sparkles size={20} className="text-secondary" />
          SEO Master
        </h1>
        <p className="font-body text-sm text-muted-foreground">
          Centralized control for headings, meta tags, and global SEO scripts. Edits here sync directly with the per-page editors.
        </p>
      </header>

      {/* ── Tab strip ─────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-border">
        <TabButton active={tab === "headings"} onClick={() => setTab("headings")} icon={Search}>
          Headings Audit
        </TabButton>
        <TabButton active={tab === "global"} onClick={() => setTab("global")} icon={Globe}>
          Global Metadata
        </TabButton>
      </div>

      {tab === "headings" ? <HeadingsAudit /> : <GlobalMetadata />}
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════════════
   TAB BUTTON
   ═════════════════════════════════════════════════════════════════════ */

const TabButton = ({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Search;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      "flex items-center gap-2 px-4 py-2 font-body text-sm border-b-2 -mb-px transition-colors",
      active
        ? "border-secondary text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground",
    ].join(" ")}
  >
    <Icon size={14} />
    {children}
  </button>
);

/* ═════════════════════════════════════════════════════════════════════
   HEADINGS AUDIT VIEW
   ─────────────────────────────────────────────────────────────────────
   Loads cms_pages + blog_posts in parallel, extracts headings, and
   renders them in a single table. Meta-title cells are editable
   in-place; on blur we push the change back to the originating table.
   ═════════════════════════════════════════════════════════════════════ */

const HeadingsAudit = () => {
  const [rows, setRows] = useState<HeadingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    // Two independent reads — kick them off in parallel for snappier load.
    const [cmsRes, blogRes] = await Promise.all([fetchAllCmsPages(), fetchAllBlogPosts()]);

    const cmsRows: HeadingRow[] = (cmsRes.data || []).map((p: any) => {
      // Prefer published rows, fall back to draft if nothing has shipped yet.
      const sourceRows = p.page_rows?.length ? p.page_rows : p.draft_page_rows || [];
      const { h1s, h2s } = extractHeadings(sourceRows);
      return {
        source: "cms_page",
        id: p.id,
        pageTitle: p.title || "(untitled)",
        slug: `/p/${p.slug}`,
        metaTitle: p.meta_title || "",
        h1s,
        h2s,
      };
    });

    const blogRows: HeadingRow[] = (blogRes.data || []).map((b: any) => ({
      source: "blog_post",
      id: b.id,
      pageTitle: b.title || "(untitled)",
      slug: `/blog/${b.slug}`,
      metaTitle: b.meta_title || "",
      // Blog posts don't use the row JSON system — their "H1" is the post title
      // and their "H2" surrogate is the excerpt. Keeping the audit useful means
      // surfacing those instead of leaving the cells empty.
      h1s: b.title ? [b.title] : [],
      h2s: b.excerpt ? [b.excerpt] : [],
    }));

    setRows([...cmsRows, ...blogRows]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return rows;
    const q = filter.toLowerCase();
    return rows.filter(
      (r) =>
        r.pageTitle.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        r.metaTitle.toLowerCase().includes(q) ||
        r.h1s.some((h) => h.toLowerCase().includes(q)) ||
        r.h2s.some((h) => h.toLowerCase().includes(q)),
    );
  }, [rows, filter]);

  /**
   * Save a meta-title edit back to the source table.
   * BI-DIRECTIONAL SYNC: because we hit `cms_pages.meta_title` /
   * `blog_posts.meta_title` directly, the per-page editor (which reads
   * the same column) shows the new value the next time it opens.
   */
  const saveMetaTitle = useCallback(
    async (row: HeadingRow, value: string) => {
      if (value === row.metaTitle) return;
      const action =
        row.source === "cms_page"
          ? () => updateCmsPageMeta(row.id, "meta_title", value)
          : () => updateBlogPost(row.id, { meta_title: value });
      await runDbAction({ action, successMessage: "Meta title updated" });
      // Reflect the new value locally so the input stays in sync without a refetch.
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, metaTitle: value } : r)));
    },
    [],
  );

  return (
    <div className="space-y-4">
      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by title, slug, or heading text…"
            className="w-full pl-9 pr-3 py-2 rounded-lg font-body text-sm bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary"
          />
        </div>
        <span className="font-body text-xs text-muted-foreground">
          {filtered.length} of {rows.length} pages
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 size={18} className="animate-spin mr-2" />
          <span className="font-body text-sm">Auditing headings…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground font-body text-sm">
          No pages match that filter.
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left font-body text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-medium">Page</th>
                <th className="px-3 py-2 font-medium">Meta Title</th>
                <th
                  className="px-3 py-2 font-medium"
                  title="The single, dominant heading for this page. Sourced from the Hero row's title_lines."
                >
                  Primary Heading (H1)
                </th>
                <th
                  className="px-3 py-2 font-medium"
                  title="Section headings for the rest of the page. Sourced from each non-hero row's title_lines."
                >
                  Section Headings (H2)
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <HeadingRowItem key={`${row.source}-${row.id}`} row={row} onSaveMetaTitle={saveMetaTitle} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const HeadingRowItem = ({
  row,
  onSaveMetaTitle,
}: {
  row: HeadingRow;
  onSaveMetaTitle: (row: HeadingRow, value: string) => void;
}) => {
  // Local draft so typing doesn't fire a write on every keystroke.
  // Commit on blur — matches the project's deferred-saving Core memory.
  const [draft, setDraft] = useState(row.metaTitle);
  useEffect(() => setDraft(row.metaTitle), [row.metaTitle]);

  const noH1 = row.h1s.length === 0;
  const multiH1 = row.h1s.length > 1;

  return (
    <tr className="border-t border-border hover:bg-muted/20 transition-colors align-top">
      <td className="px-3 py-3">
        <div className="font-body text-sm text-foreground font-medium">{row.pageTitle}</div>
        <a
          href={row.slug}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-body text-[11px] text-muted-foreground hover:text-secondary"
        >
          {row.slug}
          <ExternalLink size={10} />
        </a>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-body text-[9px] uppercase tracking-wider text-muted-foreground/70">
            {row.source === "cms_page" ? "CMS Page" : "Blog Post"}
          </span>
          {/*
            Phase-1 verification button.
            ─────────────────────────────────────────────────────────
            Calls the `ssr-index` edge function with the row's path so
            admins can confirm — without deploying a Worker — what a
            crawler / social scraper would receive. Opens in a new tab
            (text/html), so you can View Source and inspect the rewritten
            <head>.
          */}
          <button
            type="button"
            onClick={() => {
              const projectId = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID;
              if (!projectId) {
                alert("Missing VITE_SUPABASE_PROJECT_ID — cannot open SSR preview.");
                return;
              }
              const url = `https://${projectId}.supabase.co/functions/v1/ssr-index?path=${encodeURIComponent(
                row.slug,
              )}`;
              window.open(url, "_blank", "noopener,noreferrer");
            }}
            className="font-body text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-secondary/40 text-secondary hover:bg-secondary/10"
            title="Open the SSR-rendered HTML this page would serve to bots & social scrapers."
          >
            SSR preview
          </button>
        </div>
      </td>
      <td className="px-3 py-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => onSaveMetaTitle(row, draft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          placeholder="(no meta title)"
          className="w-full px-2 py-1 rounded font-body text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary"
        />
        <div className="font-body text-[9px] text-muted-foreground mt-0.5">{draft.length}/60</div>
      </td>
      <td className="px-3 py-3 max-w-[280px]">
        {noH1 ? (
          <span className="inline-flex items-center gap-1 font-body text-xs text-destructive">
            <AlertCircle size={12} /> missing
          </span>
        ) : (
          <ul className="space-y-1">
            {row.h1s.map((h, i) => (
              <li key={i} className="font-body text-xs text-foreground truncate" title={h}>
                {h}
              </li>
            ))}
          </ul>
        )}
        {multiH1 && (
          <div className="font-body text-[9px] text-destructive/80 mt-1">⚠ multiple H1s</div>
        )}
      </td>
      <td className="px-3 py-3 max-w-[280px]">
        {row.h2s.length === 0 ? (
          <span className="font-body text-xs text-muted-foreground">—</span>
        ) : (
          <ul className="space-y-1">
            {row.h2s.map((h, i) => (
              <li key={i} className="font-body text-xs text-muted-foreground truncate" title={h}>
                {row.source === "blog_post" && (
                  <span className="font-body text-[9px] uppercase tracking-wider text-muted-foreground/60 mr-1">(Excerpt)</span>
                )}
                {h}
              </li>
            ))}
          </ul>
        )}
      </td>
    </tr>
  );
};

/* ═════════════════════════════════════════════════════════════════════
   GLOBAL METADATA VIEW
   ─────────────────────────────────────────────────────────────────────
   Loads / saves the `global_seo_tags` row in site_content. We use
   `publishSection` (not `saveDraft`) because global meta has no notion
   of "draft vs. live" — admins expect the change to take effect now.
   ═════════════════════════════════════════════════════════════════════ */

const GlobalMetadata = () => {
  const [data, setData] = useState<GlobalSeoTags>(EMPTY_GLOBAL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Initial load — deep-merge to ensure nested defaults exist even if the
  // saved row predates the templated schema.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: row } = await fetchSection<Partial<GlobalSeoTags>>(GLOBAL_SEO_KEY);
      if (cancelled) return;
      if (row?.content) {
        const c = row.content as Partial<GlobalSeoTags>;
        setData({
          ...EMPTY_GLOBAL,
          ...c,
          tracking: { ...EMPTY_GLOBAL.tracking, ...(c.tracking || {}) },
          organization: {
            ...EMPTY_GLOBAL.organization,
            ...(c.organization || {}),
            social_links: Array.isArray(c.organization?.social_links) ? c.organization!.social_links : [],
          },
        });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Validate JSON-LD before saving. We don't block the save (admins
   * sometimes paste partial schemas while iterating) but we DO surface
   * the parser error so they can spot typos.
   */
  const validateJsonLd = (value: string): string | null => {
    if (!value.trim()) return null;
    try {
      JSON.parse(value);
      return null;
    } catch (err: any) {
      return `Invalid JSON: ${err.message}`;
    }
  };

  const handleSave = async () => {
    setJsonError(validateJsonLd(data.json_ld_organization));
    await runDbAction({
      action: () => publishSection(GLOBAL_SEO_KEY, data),
      setLoading: setSaving,
      successMessage: "Global SEO tags saved",
      errorMessage: "Failed to save global SEO tags",
    });
    invalidateSiteContent(GLOBAL_SEO_KEY);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 size={18} className="animate-spin mr-2" />
        <span className="font-body text-sm">Loading global metadata…</span>
      </div>
    );
  }

  // Defensive accessors: if a stale state shape (e.g., from HMR or
  // legacy DB row) ever leaves `tracking` / `organization` undefined,
  // the renderer below would crash on `data.tracking.ga4`. Pull through
  // `EMPTY_GLOBAL` defaults so the UI always has something to bind to.
  const tracking = data.tracking ?? EMPTY_GLOBAL.tracking;
  const organization = {
    ...EMPTY_GLOBAL.organization,
    ...(data.organization ?? {}),
    social_links: Array.isArray(data.organization?.social_links)
      ? data.organization!.social_links
      : [],
  };

  const setTracking = (k: keyof GlobalSeoTags["tracking"], v: string) =>
    setData({ ...data, tracking: { ...tracking, [k]: v } });

  const setOrg = <K extends keyof GlobalSeoTags["organization"]>(
    k: K,
    v: GlobalSeoTags["organization"][K],
  ) => setData({ ...data, organization: { ...organization, [k]: v } });

  const updateSocialLink = (i: number, value: string) => {
    const next = [...organization.social_links];
    next[i] = value;
    setOrg("social_links", next);
  };
  const addSocialLink = () => setOrg("social_links", [...organization.social_links, ""]);
  const removeSocialLink = (i: number) =>
    setOrg("social_links", organization.social_links.filter((_, j) => j !== i));

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="bg-muted/20 border border-border rounded-lg p-4 space-y-1">
        <div className="font-body text-xs text-muted-foreground flex items-center gap-2">
          <Code2 size={12} />
          Stored at <code className="px-1 py-0.5 rounded bg-background text-foreground">site_content.{GLOBAL_SEO_KEY}</code>
        </div>
        <p className="font-body text-xs text-muted-foreground">
          These values are global — they apply to every public page. Saving here writes to both <code>content</code> and{" "}
          <code>draft_content</code> so the change is live immediately.
        </p>
      </div>

      {/* ── TRACKING IDs ──────────────────────────────────────────────
          Replace the old "paste raw scripts" UX with three labelled
          inputs. The wiring code (in usePageMeta / index.html) reads
          these IDs and constructs the official snippet — no user-pasted
          markup means no XSS risk and no malformed tags. */}
      <section className="space-y-3 border border-border rounded-lg p-4 bg-card">
        <header className="flex items-center gap-2">
          <BarChart3 size={14} className="text-secondary" />
          <h3 className="font-display text-sm uppercase tracking-wider text-foreground">Tracking IDs</h3>
          <span
            className="font-body text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/30"
            title="These IDs are auto-injected into the live site <head> via usePageMeta."
          >
            Live
          </span>
        </header>
        <p className="font-body text-[11px] text-muted-foreground">
          Enter only the ID — we generate the official snippet for each platform automatically.
        </p>
        <Field label="Google Analytics 4 (Measurement ID)" hint="Format: G-XXXXXXXXXX">
          <input
            type="text"
            value={tracking.ga4}
            onChange={(e) => setTracking("ga4", e.target.value.trim())}
            placeholder="G-XXXXXXXXXX"
            spellCheck={false}
            className="w-full px-3 py-2 rounded-lg font-body text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary"
          />
        </Field>
        <Field label="Meta Pixel ID" hint="Numeric ID from Meta Events Manager (e.g., 1234567890)">
          <input
            type="text"
            value={tracking.meta_pixel}
            onChange={(e) => setTracking("meta_pixel", e.target.value.trim())}
            placeholder="1234567890"
            spellCheck={false}
            className="w-full px-3 py-2 rounded-lg font-body text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary"
          />
        </Field>
        <Field label="LinkedIn Partner ID" hint="From LinkedIn Campaign Manager → Insight Tag">
          <input
            type="text"
            value={tracking.linkedin_partner}
            onChange={(e) => setTracking("linkedin_partner", e.target.value.trim())}
            placeholder="1234567"
            spellCheck={false}
            className="w-full px-3 py-2 rounded-lg font-body text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary"
          />
        </Field>
      </section>

      {/* ── BRAND IDENTITY (JSON-LD source) ──────────────────────────
          Templated fields drive the Organization JSON-LD blob that
          renders into <head>. Admins fill structured fields; the public
          renderer (or a build step) assembles the schema.org payload. */}
      <section className="space-y-3 border border-border rounded-lg p-4 bg-card">
        <header className="flex items-center gap-2">
          <Building2 size={14} className="text-secondary" />
          <h3 className="font-display text-sm uppercase tracking-wider text-foreground">Brand Identity Schema</h3>
        </header>
        <p className="font-body text-[11px] text-muted-foreground">
          Used to build a schema.org Organization JSON-LD tag — helps Google's Knowledge Graph and AI assistants understand who you are.
        </p>
        <Field label="Legal Name" hint="The official registered business name.">
          <input
            type="text"
            value={organization.legal_name}
            onChange={(e) => setOrg("legal_name", e.target.value)}
            placeholder="The Magic Coffin Ltd."
            className="w-full px-3 py-2 rounded-lg font-body text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary"
          />
        </Field>
        <Field label="Organization Type" hint="Schema.org subtype that best describes your entity.">
          <select
            value={organization.type}
            onChange={(e) => setOrg("type", e.target.value)}
            className="w-full px-3 py-2 rounded-lg font-body text-sm bg-background border border-border text-foreground focus:outline-none focus:border-secondary"
          >
            {ORG_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field
          label="Social Profile Links"
          hint="Each URL becomes a sameAs entry in the JSON-LD schema. LinkedIn, Twitter/X, Instagram, YouTube, etc."
        >
          <div className="space-y-2">
            {organization.social_links.length === 0 && (
              <p className="font-body text-[11px] italic text-muted-foreground">No social profiles yet.</p>
            )}
            {organization.social_links.map((url, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => updateSocialLink(i, e.target.value)}
                  placeholder="https://linkedin.com/company/…"
                  className="flex-1 px-3 py-2 rounded-lg font-body text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary"
                />
                <button
                  type="button"
                  onClick={() => removeSocialLink(i)}
                  className="p-2 rounded-lg border border-border text-destructive hover:bg-destructive/10"
                  aria-label="Remove link"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addSocialLink}
              className="inline-flex items-center gap-1.5 font-body text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full border border-secondary/40 text-secondary hover:bg-secondary/10"
            >
              <Plus size={12} /> Add Link
            </button>
          </div>
        </Field>
      </section>

      {/* ── SOCIAL SHARING ───────────────────────────────────────── */}
      <section className="space-y-3 border border-border rounded-lg p-4 bg-card">
        <header className="flex items-center gap-2">
          <Globe size={14} className="text-secondary" />
          <h3 className="font-display text-sm uppercase tracking-wider text-foreground">Social Sharing</h3>
        </header>
        <Field
          label="Global Social Sharing Prefix"
          hint="Prepended to og:title and twitter:title for every shared link. Example: 'The Magic Coffin · '"
        >
          <input
            type="text"
            value={data.social_prefix}
            onChange={(e) => setData({ ...data, social_prefix: e.target.value })}
            maxLength={60}
            placeholder="The Magic Coffin · "
            className="w-full px-3 py-2 rounded-lg font-body text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary"
          />
          <div className="font-body text-[10px] text-muted-foreground mt-1">{data.social_prefix.length}/60</div>
        </Field>
      </section>

      {/* ── ESCAPE HATCH (collapsed by default) ──────────────────────
          The original raw <head> + JSON-LD textareas live behind a
          disclosure. Most admins should never need to open this. */}
      <AdvancedRawScripts
        data={data}
        setData={setData}
        jsonError={jsonError}
        setJsonError={setJsonError}
        validateJsonLd={validateJsonLd}
      />

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg font-body text-sm bg-secondary text-secondary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          Save Global Metadata
        </button>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════════════
   ADVANCED ESCAPE HATCH
   ─────────────────────────────────────────────────────────────────────
   Power-user disclosure. Hidden by default so the templated UX stays
   uncluttered. Opens to reveal the raw textareas the previous version
   showed unconditionally — useful when an admin needs a script the
   templates don't cover yet, or wants to override the auto-generated
   JSON-LD entirely.
   ═════════════════════════════════════════════════════════════════════ */

const AdvancedRawScripts = ({
  data,
  setData,
  jsonError,
  setJsonError,
  validateJsonLd,
}: {
  data: GlobalSeoTags;
  setData: (next: GlobalSeoTags) => void;
  jsonError: string | null;
  setJsonError: (v: string | null) => void;
  validateJsonLd: (v: string) => string | null;
}) => {
  const [open, setOpen] = useState(false);
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <section className="border border-dashed border-border rounded-lg bg-muted/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors rounded-lg"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Chevron size={14} className="text-muted-foreground" />
          <Code2 size={14} className="text-muted-foreground" />
          <span className="font-display text-sm uppercase tracking-wider text-foreground">Advanced: Raw Head Scripts</span>
        </span>
        <span className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">
          Power users only
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          <p className="font-body text-[11px] text-muted-foreground">
            Use these escape hatches only when the templated fields above can't express what you need. Pasted markup is rendered verbatim into <code>&lt;head&gt;</code>.
          </p>

          <Field
            label="Custom Scripts (Head)"
            hint="Raw HTML/JS injected into <head> on every page. For verification meta tags or scripts the templates don't cover."
          >
            <textarea
              value={data.custom_head_scripts}
              onChange={(e) => setData({ ...data, custom_head_scripts: e.target.value })}
              rows={6}
              spellCheck={false}
              placeholder={`<meta name="google-site-verification" content="..." />\n<script>...</script>`}
              className="w-full px-3 py-2 rounded-lg font-mono text-xs bg-card border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-secondary resize-y"
            />
          </Field>

          <Field
            label="JSON-LD Schema (Override)"
            hint="Optional. Overrides the auto-generated Organization schema built from Brand Identity above. Validated as JSON on save."
            error={jsonError}
          >
            <textarea
              value={data.json_ld_organization}
              onChange={(e) => {
                setData({ ...data, json_ld_organization: e.target.value });
                setJsonError(null);
              }}
              onBlur={() => setJsonError(validateJsonLd(data.json_ld_organization))}
              rows={10}
              spellCheck={false}
              placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "The Magic Coffin"\n}`}
              className="w-full px-3 py-2 rounded-lg font-mono text-xs bg-card border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-secondary resize-y"
            />
          </Field>
        </div>
      )}
    </section>
  );
};

/* ═════════════════════════════════════════════════════════════════════
   FIELD WRAPPER
   ═════════════════════════════════════════════════════════════════════ */

const Field = ({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <label className="font-body text-xs uppercase tracking-wider font-medium text-foreground block">
      {label}
    </label>
    {children}
    {error ? (
      <div className="font-body text-xs text-destructive flex items-center gap-1">
        <AlertCircle size={11} /> {error}
      </div>
    ) : hint ? (
      <p className="font-body text-[11px] text-muted-foreground leading-relaxed">{hint}</p>
    ) : null}
  </div>
);

export default SeoMaster;
