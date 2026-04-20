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
import { Loader2, Search, Globe, Code2, Sparkles, AlertCircle, ExternalLink } from "lucide-react";
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

interface GlobalSeoTags {
  custom_head_scripts: string;
  json_ld_organization: string;
  social_prefix: string;
}

const EMPTY_GLOBAL: GlobalSeoTags = {
  custom_head_scripts: "",
  json_ld_organization: "",
  social_prefix: "",
};

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
 * Walk a single row's content and pull H1 + H2 candidates.
 * `title_lines` may be an array of HTML strings OR plain strings — we
 * normalise both to plain text. `subtitle` is a single string.
 */
const extractFromRowContent = (content: unknown): { h1s: string[]; h2s: string[] } => {
  const out = { h1s: [] as string[], h2s: [] as string[] };
  if (!content || typeof content !== "object") return out;
  const c = content as Record<string, any>;

  if (Array.isArray(c.title_lines)) {
    for (const line of c.title_lines) {
      const text = stripHtml(line);
      if (text) out.h1s.push(text);
    }
  }
  const subtitle = stripHtml(c.subtitle);
  if (subtitle) out.h2s.push(subtitle);

  return out;
};

/** Walk all rows on a page and accumulate the H1/H2 lists. */
const extractHeadings = (rows: any): { h1s: string[]; h2s: string[] } => {
  const acc = { h1s: [] as string[], h2s: [] as string[] };
  if (!Array.isArray(rows)) return acc;
  for (const row of rows) {
    const found = extractFromRowContent(row?.content);
    acc.h1s.push(...found.h1s);
    acc.h2s.push(...found.h2s);
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
      if (row.source === "cms_page") {
        await runDbAction(() => updateCmsPageMeta(row.id, "meta_title", value), {
          successMessage: "Meta title updated",
        });
      } else {
        await runDbAction(() => updateBlogPost(row.id, { meta_title: value }), {
          successMessage: "Meta title updated",
        });
      }
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
                <th className="px-3 py-2 font-medium">H1 (title_lines)</th>
                <th className="px-3 py-2 font-medium">H2 (subtitle)</th>
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
        <div className="font-body text-[9px] uppercase tracking-wider text-muted-foreground/70 mt-0.5">
          {row.source === "cms_page" ? "CMS Page" : "Blog Post"}
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
          <div className="font-body text-[9px] text-amber-600 mt-1">⚠ multiple H1s</div>
        )}
      </td>
      <td className="px-3 py-3 max-w-[280px]">
        {row.h2s.length === 0 ? (
          <span className="font-body text-xs text-muted-foreground">—</span>
        ) : (
          <ul className="space-y-1">
            {row.h2s.map((h, i) => (
              <li key={i} className="font-body text-xs text-muted-foreground truncate" title={h}>
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

  // Initial load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: row } = await fetchSection<GlobalSeoTags>(GLOBAL_SEO_KEY);
      if (cancelled) return;
      if (row?.content) {
        setData({ ...EMPTY_GLOBAL, ...(row.content as GlobalSeoTags) });
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
    setSaving(true);
    setJsonError(validateJsonLd(data.json_ld_organization));
    await runDbAction(() => publishSection(GLOBAL_SEO_KEY, data), {
      successMessage: "Global SEO tags saved",
      errorMessage: "Failed to save global SEO tags",
    });
    invalidateSiteContent(GLOBAL_SEO_KEY);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 size={18} className="animate-spin mr-2" />
        <span className="font-body text-sm">Loading global metadata…</span>
      </div>
    );
  }

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

      <Field
        label="Custom Scripts (Head)"
        hint="Raw HTML/JS injected into <head> on every page. Use for analytics, verification meta tags, or third-party scripts."
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
        label="JSON-LD Schema (Organization)"
        hint="Structured data describing your organization. Validated as JSON on save. Helps Google's Knowledge Graph and AI assistants understand your brand."
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
          placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "The Magic Coffin",\n  "url": "https://themagiccoffin.com"\n}`}
          className="w-full px-3 py-2 rounded-lg font-mono text-xs bg-card border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-secondary resize-y"
        />
      </Field>

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
          className="w-full px-3 py-2 rounded-lg font-body text-sm bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary"
        />
        <div className="font-body text-[10px] text-muted-foreground mt-1">{data.social_prefix.length}/60</div>
      </Field>

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
