import { useState, useEffect } from "react";
import { Plus, Trash2, ExternalLink, Globe, FileText, Save, Eye, Home, AlertTriangle, Copy, Pencil } from "lucide-react";
import { toast } from "sonner";
import RowsManager from "./site-editor/RowsManager";
import { SectionBox, Field } from "./site-editor/FieldComponents";
import SeoFields from "./site-editor/SeoFields";
import type { PageRow } from "@/types/rows";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { SpinnerButton } from "@/components/ui/spinner-button";
import { runDbAction, runOptimisticAction } from "@/services/db-helpers";
import {
  fetchAllCmsPages, createCmsPage, deleteCmsPage,
  saveCmsPageDraft, saveCmsPageRows, togglePublishCmsPage,
  updateCmsPageMeta, duplicateCmsPage, RESERVED_SLUGS,
} from "@/services/cmsPages";
import { fetchSection, publishSection } from "@/services/siteContent";
import { useListFilters } from "@/hooks/useListFilters";
import ListFilters from "@/components/ui/list-filters";

/**
 * ════════════════════════════════════════════════════════════════════
 * ERROR PAGE COPY EDITORS
 * ════════════════════════════════════════════════════════════════════
 * The 404 (`/...not-found`) page and the global "Something went wrong"
 * fallback are rendered by `src/pages/NotFound.tsx` and
 * `src/components/ui/error-boundary.tsx` respectively. Their copy lives
 * in `site_content` under the keys below so admins can edit it without
 * touching code. If a key is missing in the DB, the components fall back
 * to hardcoded defaults (defined in their own files) so the site still
 * renders during error storms.
 */
const ERROR_404_KEY = "error_404";
const ERROR_BOUNDARY_KEY = "error_boundary";

interface Error404Content {
  headline: string;
  subhead: string;
  cta_label: string;
}
const ERROR_404_DEFAULTS: Error404Content = {
  headline: "404",
  subhead: "Oops! We couldn’t find that page.",
  cta_label: "Return to home",
};

interface ErrorBoundaryContent {
  headline: string;
  body: string;
  retry_label: string;
  home_label: string;
  technical_details_label: string;
  row_fallback_label: string;
  row_fallback_retry_label: string;
}
const ERROR_BOUNDARY_DEFAULTS: ErrorBoundaryContent = {
  headline: "Something went wrong",
  body: "We hit an unexpected snag while loading this page. The rest of the site is still working — you can head back to the homepage or try again.",
  retry_label: "Try again",
  home_label: "Back to home",
  technical_details_label: "Technical details",
  row_fallback_label: "Section unavailable",
  row_fallback_retry_label: "Retry",
};

interface CmsPage {
  id: string;
  slug: string;
  title: string;
  template_type: string;
  page_rows: PageRow[];
  draft_page_rows: PageRow[] | null;
  status: string;
  created_at: string;
  /** Last edited timestamp — surfaced in the Pages table view (US 3.2). */
  updated_at: string;
  meta_title?: string;
  meta_description?: string;
  ai_summary?: string;
}

interface CmsPageRef {
  id: string;
  slug: string;
  title: string;
}

interface Props {
  onEditPage?: (page: CmsPageRef | null) => void;
  /**
   * When true, opens the "Create Page" inline form on first mount. The
   * Admin Overview Dashboard sets this when the user clicks its
   * prominent "Create New Page" CTA so the create form is one click —
   * not two — away from the welcome screen. Resets after consumption
   * so re-rendering the tab won't re-open the form.
   */
  autoOpenCreate?: boolean;
  /** Called once `autoOpenCreate` has been consumed. */
  onAutoOpenConsumed?: () => void;
}

const PagesManager = ({ onEditPage, autoOpenCreate, onAutoOpenConsumed }: Props) => {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<CmsPage | null>(null);
  const [editingBlog, setEditingBlog] = useState(false);
  // Which error-page editor is open (null = none).
  const [editingError, setEditingError] = useState<"404" | "boundary" | null>(null);
  const [error404, setError404] = useState<Error404Content>(ERROR_404_DEFAULTS);
  const [errorBoundary, setErrorBoundary] = useState<ErrorBoundaryContent>(ERROR_BOUNDARY_DEFAULTS);
  const [blogContent, setBlogContent] = useState<{ rows_above: PageRow[]; rows_below: PageRow[]; header_title: string; header_subtitle: string; meta_title: string; meta_description: string }>({
    rows_above: [], rows_below: [], header_title: "Insights & Articles", header_subtitle: "Sharp thinking on internal communications, employee experience, and the culture vampires lurking in your organisation.", meta_title: "", meta_description: "",
  });
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [isCreatingPage, setIsCreatingPage] = useState(false);

  // Honour the dashboard's "Create New Page" CTA — open the inline
  // form on mount, then signal consumption so the parent can clear
  // the flag (prevents the form re-opening on every re-render).
  useEffect(() => {
    if (autoOpenCreate) {
      setShowCreate(true);
      onAutoOpenConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenCreate]);

  // Search/filter/sort over the CMS pages list. Searches title + slug + status.
  // Type filter dropdown surfaces published/draft. URL params: ?pq, ?ptype, ?psort.
  const pageFilters = useListFilters<CmsPage>({
    items: pages,
    paramPrefix: "p",
    defaultSort: "manual",
    searchableText: (p) => `${p.title} ${p.slug} ${p.status}`.toLowerCase(),
    categoryOf: (p) => p.status,
    alphaKey: (p) => p.title.toLowerCase(),
    updatedKey: (p) => p.created_at,
  });
  const filteredPages = pageFilters.filteredItems;

  const load = async () => {
    const { data } = await fetchAllCmsPages();
    setPages(((data as unknown) as CmsPage[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); loadBlogPage(); loadErrorPages(); }, []);

  const loadBlogPage = async () => {
    const { data } = await fetchSection("blog_page");
    if (data?.content) {
      const c = data.content as any;
      setBlogContent({
        rows_above: c.rows_above || [],
        rows_below: c.rows_below || [],
        header_title: c.header_title || "Insights & Articles",
        header_subtitle: c.header_subtitle || "Sharp thinking on internal communications, employee experience, and the culture vampires lurking in your organisation.",
        meta_title: c.meta_title || "",
        meta_description: c.meta_description || "",
      });
    }
  };

  /**
   * Load editable copy for the 404 + global error pages. We merge over
   * the hardcoded defaults so newly-added fields auto-populate on first
   * render, and so the editor never shows undefined inputs.
   */
  const loadErrorPages = async () => {
    const [{ data: e404 }, { data: eBoundary }] = await Promise.all([
      fetchSection(ERROR_404_KEY),
      fetchSection(ERROR_BOUNDARY_KEY),
    ]);
    if (e404?.content) setError404({ ...ERROR_404_DEFAULTS, ...(e404.content as Error404Content) });
    if (eBoundary?.content) setErrorBoundary({ ...ERROR_BOUNDARY_DEFAULTS, ...(eBoundary.content as ErrorBoundaryContent) });
  };

  const saveBlogPage = (updates: Partial<typeof blogContent>) => {
    const next = { ...blogContent, ...updates };
    setBlogContent(next);
    return runDbAction({
      action: () => publishSection("blog_page", next),
      successMessage: "Saved",
      errorMessage: "Save failed",
    });
  };

  /** Persist 404 copy. Field components save on blur, so this is debounced naturally. */
  const saveError404 = (updates: Partial<Error404Content>) => {
    const next = { ...error404, ...updates };
    setError404(next);
    return runDbAction({
      action: () => publishSection(ERROR_404_KEY, next),
      successMessage: "Saved",
      errorMessage: "Save failed",
    });
  };

  const saveErrorBoundary = (updates: Partial<ErrorBoundaryContent>) => {
    const next = { ...errorBoundary, ...updates };
    setErrorBoundary(next);
    return runDbAction({
      action: () => publishSection(ERROR_BOUNDARY_KEY, next),
      successMessage: "Saved",
      errorMessage: "Save failed",
    });
  };

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const createPage = async () => {
    if (!newTitle.trim()) { toast.error("Title required"); return; }
    const slug = newSlug.trim() || slugify(newTitle);

    if (RESERVED_SLUGS.includes(slug)) {
      toast.error(`"${slug}" is a reserved system route. Choose a different slug.`);
      return;
    }

    const result = await runDbAction({
      action: () => createCmsPage(newTitle.trim(), slug),
      setLoading: setIsCreatingPage,
      successMessage: "Page created",
    });

    if (result !== null) {
      setNewTitle("");
      setNewSlug("");
      setShowCreate(false);
      load();
    }
  };

  /**
   * Optimistic delete: remove from the list immediately and roll back if
   * the server says no. This makes deletes feel instant on a slow network.
   * See db-helpers.ts header for the pattern.
   */
  const deletePage = (id: string) => {
    if (!confirm("Delete this page permanently?")) return;
    if (editingPage?.id === id) setEditingPage(null);
    return runOptimisticAction({
      snapshot: () => pages,
      applyOptimistic: () => setPages((p) => p.filter((x) => x.id !== id)),
      rollback: (prev) => setPages(prev),
      action: () => deleteCmsPage(id),
      successMessage: "Deleted",
    });
  };

  const savePageRows = async (page: CmsPage, rows: PageRow[]) => {
    const result = await runDbAction({
      action: () => saveCmsPageRows(page.id, rows),
      successMessage: "Saved & Published",
      errorMessage: "Save failed",
    });
    if (result !== null) {
      setEditingPage({ ...page, page_rows: rows, draft_page_rows: rows });
      load();
    }
  };

  const saveDraft = async (page: CmsPage, rows: PageRow[]) => {
    const result = await runDbAction({
      action: () => saveCmsPageDraft(page.id, rows),
      successMessage: "Draft saved",
      errorMessage: "Save failed",
    });
    if (result !== null) {
      setEditingPage({ ...page, draft_page_rows: rows });
    }
  };

  const previewPage = (page: CmsPage) => {
    window.open(`/p/${page.slug}?preview=draft`, "_blank");
  };

  const togglePublish = async (page: CmsPage) => {
    const newStatus = page.status === "published" ? "draft" : "published";
    const result = await runDbAction({
      action: () => togglePublishCmsPage(page.id, newStatus),
      successMessage: newStatus === "published" ? "Published!" : "Unpublished",
    });
    if (result !== null) {
      if (editingPage?.id === page.id) setEditingPage({ ...page, status: newStatus });
      load();
    }
  };

  if (loading) return <ListSkeleton rows={3} rowHeight="h-14" />;

  /**
   * ────────────────────────────────────────────────────────────────
   * ERROR PAGE EDITORS
   * ────────────────────────────────────────────────────────────────
   * Inline editors for the 404 + global error fallback copy. Each
   * <Field> auto-saves on blur via the saveError404/saveErrorBoundary
   * helpers above (which write to `site_content` and toast).
   *
   * To add a new editable string:
   *   1. Extend the corresponding interface (Error404Content / ErrorBoundaryContent).
   *   2. Add it to the matching DEFAULTS object with a sensible value.
   *   3. Add a <Field> below.
   *   4. Read it in NotFound.tsx or error-boundary.tsx via useSiteContent().
   */
  if (editingError === "404") {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setEditingError(null)}
          className="font-body text-xs uppercase tracking-wider hover:opacity-70"
          style={{ color: "hsl(var(--primary))" }}>
          ← Back to Pages
        </button>
        <h2 className="font-display text-lg font-bold" style={{ color: "hsl(var(--foreground))" }}>
          404 / Not Found Page
          <span className="font-body text-xs font-normal ml-2" style={{ color: "hsl(var(--muted-foreground))" }}>system</span>
        </h2>
        <p className="font-body text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
          Shown to visitors who land on a URL that doesn't exist. Light theme — kept visually neutral on purpose.
        </p>
        <div className="space-y-3">
          <Field label="Headline" value={error404.headline} onChange={(v) => saveError404({ headline: v })} />
          <Field label="Subhead" value={error404.subhead} onChange={(v) => saveError404({ subhead: v })} />
          <Field label="CTA button label" value={error404.cta_label} onChange={(v) => saveError404({ cta_label: v })} />
        </div>
        <a
          href="/__force-404-preview"
          target="_blank"
          className="inline-flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80"
          style={{ border: "1px solid hsl(var(--primary) / 0.4)", color: "hsl(var(--primary))" }}>
          <Eye size={13} /> Preview live 404
        </a>
      </div>
    );
  }

  if (editingError === "boundary") {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setEditingError(null)}
          className="font-body text-xs uppercase tracking-wider hover:opacity-70"
          style={{ color: "hsl(var(--primary))" }}>
          ← Back to Pages
        </button>
        <h2 className="font-display text-lg font-bold" style={{ color: "hsl(var(--foreground))" }}>
          Error / "Something went wrong" Page
          <span className="font-body text-xs font-normal ml-2" style={{ color: "hsl(var(--muted-foreground))" }}>system</span>
        </h2>
        <p className="font-body text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
          Shown when a page or section crashes unexpectedly. The first 4 fields drive the full-page fallback; the last 2 drive the inline per-row fallback.
        </p>
        <div className="space-y-3">
          <Field label="Headline" value={errorBoundary.headline} onChange={(v) => saveErrorBoundary({ headline: v })} />
          <Field label="Body" value={errorBoundary.body} onChange={(v) => saveErrorBoundary({ body: v })} />
          <Field label="Retry button label" value={errorBoundary.retry_label} onChange={(v) => saveErrorBoundary({ retry_label: v })} />
          <Field label="Home button label" value={errorBoundary.home_label} onChange={(v) => saveErrorBoundary({ home_label: v })} />
          <Field label="Technical details toggle label" value={errorBoundary.technical_details_label} onChange={(v) => saveErrorBoundary({ technical_details_label: v })} />
          <Field label="Inline row fallback label" value={errorBoundary.row_fallback_label} onChange={(v) => saveErrorBoundary({ row_fallback_label: v })} />
          <Field label="Inline row retry label" value={errorBoundary.row_fallback_retry_label} onChange={(v) => saveErrorBoundary({ row_fallback_retry_label: v })} />
        </div>
      </div>
    );
  }


  if (editingBlog) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setEditingBlog(false)}
          className="font-body text-xs uppercase tracking-wider hover:opacity-70"
          style={{ color: "hsl(var(--primary))" }}>
          ← Back to Pages
        </button>
        <h2 className="font-display text-lg font-bold" style={{ color: "hsl(var(--foreground))" }}>
          Blog Page
          <span className="font-body text-xs font-normal ml-2" style={{ color: "hsl(var(--muted-foreground))" }}>/blog</span>
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Header Title" value={blogContent.header_title} onChange={(v) => saveBlogPage({ header_title: v })} />
          <Field label="Header Subtitle" value={blogContent.header_subtitle} onChange={(v) => saveBlogPage({ header_subtitle: v })} />
        </div>

        <SeoFields
          metaTitle={blogContent.meta_title}
          metaDescription={blogContent.meta_description}
          onTitleChange={(v) => saveBlogPage({ meta_title: v })}
          onDescriptionChange={(v) => saveBlogPage({ meta_description: v })}
        />

        <SectionBox label="Rows Above Blog Listing">
          <RowsManager rows={blogContent.rows_above} onChange={(rows) => saveBlogPage({ rows_above: rows })} />
        </SectionBox>

        <div className="p-4 rounded-lg border-2 border-dashed text-center" style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
          <span className="font-body text-xs uppercase tracking-wider">⬇ Blog Posts Listing (auto-generated) ⬇</span>
        </div>

        <SectionBox label="Rows Below Blog Listing">
          <RowsManager rows={blogContent.rows_below} onChange={(rows) => saveBlogPage({ rows_below: rows })} />
        </SectionBox>
      </div>
    );
  }

  if (editingPage) {
    const draftRows = editingPage.draft_page_rows || editingPage.page_rows || [];
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setEditingPage(null)}
            className="font-body text-xs uppercase tracking-wider hover:opacity-70"
            style={{ color: "hsl(var(--primary))" }}>
            ← Back to Pages
          </button>
          <div className="flex items-center gap-2">
            <span className={`font-body text-[9px] uppercase tracking-wider px-2 py-1 rounded-full ${editingPage.status === "published" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
              {editingPage.status}
            </span>
            <button
              onClick={() => saveDraft(editingPage, draftRows)}
              className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
              style={{ border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}>
              <Save size={13} /> Save Draft
            </button>
            <button
              onClick={() => previewPage(editingPage)}
              className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
              style={{ border: "1px solid hsl(var(--primary) / 0.4)", color: "hsl(var(--primary))" }}>
              <Eye size={13} /> Preview
            </button>
            <button
              onClick={() => savePageRows(editingPage, draftRows)}
              className="font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
              style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
              {editingPage.status === "published" ? "Save & Publish" : "Publish"}
            </button>
          </div>
        </div>
        <h2 className="font-display text-lg font-bold" style={{ color: "hsl(var(--foreground))" }}>
          {editingPage.title}
          <span className="font-body text-xs font-normal ml-2" style={{ color: "hsl(var(--muted-foreground))" }}>/{editingPage.slug}</span>
        </h2>
        {/* SeoFields now hosts AEO too — pass aiSummary props to enable
            the AI Search Summary block (60-320 char counter). */}
        <SeoFields
          metaTitle={editingPage.meta_title || ""}
          metaDescription={editingPage.meta_description || ""}
          onTitleChange={(v) => {
            setEditingPage({ ...editingPage, meta_title: v });
            updateCmsPageMeta(editingPage.id, "meta_title", v);
          }}
          onDescriptionChange={(v) => {
            setEditingPage({ ...editingPage, meta_description: v });
            updateCmsPageMeta(editingPage.id, "meta_description", v);
          }}
          aiSummary={editingPage.ai_summary || ""}
          onAiSummaryChange={(v) => {
            setEditingPage({ ...editingPage, ai_summary: v });
            // Persist on every keystroke is fine here — input is short and the
            // network write is idempotent. Toast only when the value is non-empty
            // to avoid spamming on backspace-to-empty.
            updateCmsPageMeta(editingPage.id, "ai_summary", v.trim());
          }}
        />
        <RowsManager
          rows={draftRows}
          onChange={(rows) => {
            setEditingPage({ ...editingPage, draft_page_rows: rows });
            saveDraft(editingPage, rows);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold" style={{ color: "hsl(var(--foreground))" }}>Pages</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
          style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
          <Plus size={14} /> Create Page
        </button>
      </div>

      {showCreate && (
        <div className="p-4 rounded-lg border space-y-3" style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-body text-[10px] uppercase tracking-wider mb-1 block" style={{ color: "hsl(var(--muted-foreground))" }}>Page Title</label>
              <input
                value={newTitle}
                onChange={(e) => { setNewTitle(e.target.value); if (!newSlug) setNewSlug(slugify(e.target.value)); }}
                placeholder="About Us"
                className="w-full px-3 py-2 rounded-lg font-body text-sm border"
                style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
              />
            </div>
            <div>
              <label className="font-body text-[10px] uppercase tracking-wider mb-1 block" style={{ color: "hsl(var(--muted-foreground))" }}>URL Slug</label>
              <input
                value={newSlug}
                onChange={(e) => setNewSlug(slugify(e.target.value))}
                placeholder="about-us"
                className="w-full px-3 py-2 rounded-lg font-body text-sm border"
                style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={createPage}
              className="font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80"
              style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
              Create
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewTitle(""); setNewSlug(""); }}
              className="font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-70"
              style={{ color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* System Pages */}
      <div className="space-y-2">
        <label className="font-body text-[10px] uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>System Pages</label>

        {/* Main Page */}
        <div
          className="flex items-center justify-between p-3 rounded-lg border"
          style={{ borderColor: "hsl(var(--border) / 0.5)", backgroundColor: "hsl(var(--card))" }}>
          <div className="flex items-center gap-3">
            <Home size={16} style={{ color: "hsl(var(--muted-foreground))" }} />
            <div>
              <span className="font-body text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>Main Page</span>
              <span className="font-body text-xs ml-2" style={{ color: "hsl(var(--muted-foreground))" }}>/</span>
            </div>
            <span className="font-body text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">system</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEditPage?.(null)}
              className="p-2 rounded hover:opacity-70"
              style={{ color: "hsl(var(--primary))" }}>
              Edit
            </button>
            <a href="/" target="_blank" className="p-2 rounded hover:opacity-70" style={{ color: "hsl(var(--muted-foreground))" }}>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Blog */}
        <div
          className="flex items-center justify-between p-3 rounded-lg border"
          style={{ borderColor: "hsl(var(--border) / 0.5)", backgroundColor: "hsl(var(--card))" }}>
          <div className="flex items-center gap-3">
            <Globe size={16} style={{ color: "hsl(var(--muted-foreground))" }} />
            <div>
              <span className="font-body text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>Blog</span>
              <span className="font-body text-xs ml-2" style={{ color: "hsl(var(--muted-foreground))" }}>/blog</span>
            </div>
            <span className="font-body text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">system</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditingBlog(true)}
              className="p-2 rounded hover:opacity-70"
              style={{ color: "hsl(var(--primary))" }}>
              Edit
            </button>
            <a href="/blog" target="_blank" className="p-2 rounded hover:opacity-70" style={{ color: "hsl(var(--muted-foreground))" }}>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* 404 / Not Found */}
        <div
          className="flex items-center justify-between p-3 rounded-lg border"
          style={{ borderColor: "hsl(var(--border) / 0.5)", backgroundColor: "hsl(var(--card))" }}>
          <div className="flex items-center gap-3">
            <AlertTriangle size={16} style={{ color: "hsl(var(--muted-foreground))" }} />
            <div>
              <span className="font-body text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>404 / Not Found</span>
              <span className="font-body text-xs ml-2" style={{ color: "hsl(var(--muted-foreground))" }}>shown for unknown URLs</span>
            </div>
            <span className="font-body text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">system</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditingError("404")}
              className="p-2 rounded hover:opacity-70"
              style={{ color: "hsl(var(--primary))" }}>
              Edit
            </button>
          </div>
        </div>

        {/* Error / Something went wrong */}
        <div
          className="flex items-center justify-between p-3 rounded-lg border"
          style={{ borderColor: "hsl(var(--border) / 0.5)", backgroundColor: "hsl(var(--card))" }}>
          <div className="flex items-center gap-3">
            <AlertTriangle size={16} style={{ color: "hsl(var(--muted-foreground))" }} />
            <div>
              <span className="font-body text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>Something went wrong</span>
              <span className="font-body text-xs ml-2" style={{ color: "hsl(var(--muted-foreground))" }}>error fallback</span>
            </div>
            <span className="font-body text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">system</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditingError("boundary")}
              className="p-2 rounded hover:opacity-70"
              style={{ color: "hsl(var(--primary))" }}>
              Edit
            </button>
          </div>
        </div>
      </div>

      {pages.length === 0 ? (
        <div className="py-12 text-center font-body text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          No custom pages yet. Create your first page above.
        </div>
      ) : (
        <div className="space-y-2">
          <label className="font-body text-[10px] uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Custom Pages</label>
          {pages.length > 1 && (
            <ListFilters state={pageFilters.state} searchPlaceholder="Search pages…" />
          )}
          {filteredPages.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground py-6 text-center">No pages match your filters.</p>
          ) : filteredPages.map((page) => (
            <div
              key={page.id}
              className="flex items-center justify-between p-3 rounded-lg border hover:opacity-90 transition-opacity"
              style={{ borderColor: "hsl(var(--border) / 0.5)", backgroundColor: "hsl(var(--card))" }}>
              <div className="flex items-center gap-3">
                <FileText size={16} style={{ color: "hsl(var(--muted-foreground))" }} />
                <div>
                  <span className="font-body text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>{page.title}</span>
                  <span className="font-body text-xs ml-2" style={{ color: "hsl(var(--muted-foreground))" }}>/{page.slug}</span>
                </div>
                <span className={`font-body text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full ${page.status === "published" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {page.status}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (onEditPage) {
                      onEditPage({ id: page.id, slug: page.slug, title: page.title });
                    } else {
                      setEditingPage(page);
                    }
                  }}
                  className="p-2 rounded hover:opacity-70"
                  style={{ color: "hsl(var(--primary))" }}>
                  Edit
                </button>
                {page.status === "published" && (
                  <a href={`/p/${page.slug}`} target="_blank" className="p-2 rounded hover:opacity-70" style={{ color: "hsl(var(--muted-foreground))" }}>
                    <ExternalLink size={14} />
                  </a>
                )}
                <button onClick={() => deletePage(page.id)} className="p-2 rounded hover:opacity-70" style={{ color: "hsl(var(--destructive))" }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PagesManager;
