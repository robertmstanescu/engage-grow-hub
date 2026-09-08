import { useState, useEffect, useCallback } from "react";
import { Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ActionMenu from "./ui/ActionMenu";
import { MENU_DIVIDER } from "./ui/menu";
import { toast } from "sonner";
import RowsManager from "./site-editor/RowsManager";
import { SectionBox, Field } from "./site-editor/FieldComponents";
import SeoFields from "./site-editor/SeoFields";
import type { PageRow } from "@/types/rows";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { SpinnerButton } from "@/components/ui/spinner-button";
import { runDbAction, runOptimisticAction } from "@/services/db-helpers";
import {
  type CmsPage,
  fetchAllCmsPages, createCmsPage, deleteCmsPage,
  togglePublishCmsPage, duplicateCmsPage, renameCmsPage, RESERVED_SLUGS,
} from "@/services/cmsPages";
import { DEFAULT_PAGE_SIZE } from "@/services/pagination";
import { fetchSection, publishSection } from "@/services/siteContent";
import { useListFilters } from "@/hooks/useListFilters";
import { createRedirect } from "@/services/redirects";
import ListFilters from "@/components/ui/list-filters";
import { ListPager } from "@/components/ui/list-pager";
import { contentState, STATE_LABEL } from "./naming";

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
  const [pageNum, setPageNum] = useState(1);
  const [totalCmsPages, setTotalCmsPages] = useState(0);
  const [renaming, setRenaming] = useState<{ id: string; title: string; slug: string } | null>(null);
  /* Home lives in site_content; "unpublished changes" = its draft differs from live. */
  const [homeChanges, setHomeChanges] = useState(false);
  const [editingBlog, setEditingBlog] = useState(false);
  // Which error-page editor is open (null = none).
  const [editingError, setEditingError] = useState<"404" | "boundary" | null>(null);
  const [error404, setError404] = useState<Error404Content>(ERROR_404_DEFAULTS);
  const [errorBoundary, setErrorBoundary] = useState<ErrorBoundaryContent>(ERROR_BOUNDARY_DEFAULTS);
  const [blogContent, setBlogContent] = useState<{ rows_above: PageRow[]; rows_below: PageRow[]; header_title: string; header_subtitle: string; meta_title: string; meta_description: string }>({
    rows_above: [], rows_below: [], header_title: "Blog", header_subtitle: "Articles, updates and ideas.", meta_title: "", meta_description: "",
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
    // "Last Edited" is the natural sort axis for a CMS page table —
    // editors usually want to find the page they touched most recently.
    updatedKey: (p) => p.updated_at || p.created_at,
  });
  const filteredPages = pageFilters.filteredItems;

  const load = useCallback(async () => {
    const { data, count } = await fetchAllCmsPages(pageNum, DEFAULT_PAGE_SIZE);
    setPages(((data as unknown) as CmsPage[]) || []);
    if (typeof count === "number") setTotalCmsPages(count);
    setLoading(false);
  }, [pageNum]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadBlogPage(); loadErrorPages(); loadHome(); }, []);

  const loadHome = async () => {
    const { data } = await supabase.from("site_content").select("content, draft_content").eq("section_key", "page_rows").maybeSingle();
    if (data) setHomeChanges(data.draft_content != null && JSON.stringify(data.draft_content) !== JSON.stringify(data.content));
  };

  const loadBlogPage = async () => {
    const { data } = await fetchSection("blog_page");
    if (data?.content) {
      const c = data.content as any;
      setBlogContent({
        rows_above: c.rows_above || [],
        rows_below: c.rows_below || [],
        header_title: c.header_title || "Blog",
        header_subtitle: c.header_subtitle || "Articles, updates and ideas.",
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
      // New pages sort to page 1 (newest first) — jump there so it's visible.
      if (pageNum !== 1) setPageNum(1);
      else load();
    }
  };

  /**
   * Optimistic delete: remove from the list immediately and roll back if
   * the server says no. This makes deletes feel instant on a slow network.
   * See db-helpers.ts header for the pattern.
   */
  const deletePage = (id: string) => {
    if (!confirm("Delete this page? Visitors get a redirect to the home page.")) return;
    // Redirects manager — capture the slug before the row is gone so a
    // published page's old URL redirects home instead of 404ing.
    const target = pages.find((p) => p.id === id);
    return runOptimisticAction({
      snapshot: () => pages,
      applyOptimistic: () => {
        setPages((p) => p.filter((x) => x.id !== id));
        setTotalCmsPages((prev) => Math.max(0, prev - 1));
      },
      rollback: (prev) => {
        setPages(prev);
        setTotalCmsPages((prev) => prev + 1);
      },
      action: async () => {
        const result = await deleteCmsPage(id);
        if (!result.error && target?.status === "published" && target.slug) {
          createRedirect(`/${target.slug}`, "/", "auto");
        }
        return result;
      },
      successMessage: "Deleted",
    });
  };

  /**
   * Duplicate a page (US 3.2). Server-side helper handles the slug
   * collision logic — we just toast and reload. We deliberately do NOT
   * jump the user into the new page's editor: the table view is the
   * mental model here, and surprising context switches break flow.
   */
  const duplicatePage = async (id: string) => {
    const result = await runDbAction({
      action: () => duplicateCmsPage(id),
      successMessage: "Page duplicated",
      errorMessage: "Could not duplicate page",
    });
    if (result !== null) load();
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
    if (result !== null) load();
  };

  const renamePage = async () => {
    if (!renaming) return;
    const slug = slugify(renaming.slug || renaming.title);
    if (!renaming.title.trim()) { toast.error("Title required"); return; }
    if (RESERVED_SLUGS.includes(slug)) { toast.error(`"${slug}" is a reserved address.`); return; }
    const old = pages.find((p) => p.id === renaming.id);
    const result = await runDbAction({
      action: () => renameCmsPage(renaming.id, renaming.title.trim(), slug),
      successMessage: "Renamed",
      errorMessage: "Could not rename",
    });
    if (result !== null) {
      if (old && old.status === "published" && old.slug !== slug) createRedirect(`/${old.slug}`, `/${slug}`, "auto");
      setRenaming(null);
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

  const status = (p: CmsPage) => {
    const st = contentState(p.status, p.publish_at);
    const changes = st === "live" && p.draft_page_rows != null && JSON.stringify(p.draft_page_rows) !== JSON.stringify(p.page_rows);
    return changes ? { cls: "changes", label: "Unpublished changes" } : { cls: st, label: STATE_LABEL[st] };
  };
  const when = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const blocks = (p: CmsPage) => (Array.isArray(p.page_rows) ? p.page_rows.length : 0);

  return (
    <div className="admin-page space-y-4">
      <div className="admin-page-head">
        <h2 className="admin-h2">Pages</h2>
        <div className="admin-grow" />
        {pages.length > 1 && (
          <input
            className="admin-search"
            placeholder="Filter pages"
            value={pageFilters.state.searchInput}
            onChange={(e) => pageFilters.state.setSearchInput(e.target.value)}
            aria-label="Filter pages"
          />
        )}
        <button type="button" onClick={() => setShowCreate(!showCreate)} className="admin-btn primary">New page</button>
      </div>

      {showCreate && (
        <div className="admin-panel" style={{ padding: 12 }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-body text-[11px] block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Title</label>
              <input
                value={newTitle}
                onChange={(e) => { setNewTitle(e.target.value); if (!newSlug) setNewSlug(slugify(e.target.value)); }}
                placeholder="About Us"
                className="admin-input"
              />
            </div>
            <div>
              <label className="font-body text-[11px] block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Address</label>
              <input value={newSlug} onChange={(e) => setNewSlug(slugify(e.target.value))} placeholder="about-us" className="admin-input" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <SpinnerButton onClick={createPage} isLoading={isCreatingPage} className="admin-btn primary">Create</SpinnerButton>
            <button type="button" onClick={() => { setShowCreate(false); setNewTitle(""); setNewSlug(""); }} className="admin-btn">Cancel</button>
          </div>
        </div>
      )}

      <table className="admin-table">
        <thead>
          <tr><th>Page</th><th>Address</th><th className="r">Blocks</th><th>Status</th><th>Updated</th><th className="act"></th></tr>
        </thead>
        <tbody>
          {/* Home is a page like any other; it just lives in a different table. */}
          <tr>
            <td className="n">Home<span className="admin-tag">home</span></td>
            <td className="m addr"><code>/</code></td>
            <td className="r">—</td>
            <td><span className={`admin-st ${homeChanges ? "changes" : "live"}`}>{homeChanges ? "Unpublished changes" : "Live"}</span></td>
            <td className="m">—</td>
            <td className="act">
              <button type="button" className="admin-link" onClick={() => onEditPage?.(null)}>Edit</button>
              <ActionMenu
                label="Actions for Home"
                items={[
                  { key: "edit", label: "Edit", onSelect: () => onEditPage?.(null) },
                  { key: "view", label: "View live", onSelect: () => window.open("/", "_blank") },
                ]}
              />
            </td>
          </tr>
          {filteredPages.map((page) => {
            const st = status(page);
            const live = page.status === "published";
            if (renaming?.id === page.id) {
              return (
                <tr key={page.id}>
                  <td colSpan={6}>
                    <div className="flex items-end gap-2 flex-wrap">
                      <div style={{ flex: "1 1 200px" }}>
                        <label className="font-body text-[11px] block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Title</label>
                        <input className="admin-input" value={renaming.title} onChange={(e) => setRenaming({ ...renaming, title: e.target.value })} autoFocus />
                      </div>
                      <div style={{ flex: "1 1 200px" }}>
                        <label className="font-body text-[11px] block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Address</label>
                        <input className="admin-input" value={renaming.slug} onChange={(e) => setRenaming({ ...renaming, slug: slugify(e.target.value) })} />
                      </div>
                      <button type="button" className="admin-btn primary" onClick={renamePage}>Save</button>
                      <button type="button" className="admin-btn" onClick={() => setRenaming(null)}>Cancel</button>
                    </div>
                    {live && <p className="admin-sub" style={{ marginTop: 6 }}>Changing the address of a live page adds a redirect from the old one.</p>}
                  </td>
                </tr>
              );
            }
            return (
              <tr key={page.id}>
                <td className="n">{page.title}</td>
                <td className="m addr"><code>/{page.slug}</code></td>
                <td className="r">{blocks(page)}</td>
                <td><span className={`admin-st ${st.cls}`}>{st.label}</span></td>
                <td className="m">{when(page.updated_at || page.created_at)}</td>
                <td className="act">
                  <button
                    type="button"
                    className="admin-link"
                    onClick={() => onEditPage?.({ id: page.id, slug: page.slug, title: page.title })}
                  >
                    Edit
                  </button>
                  <ActionMenu
                    label={`Actions for ${page.title}`}
                    items={[
                      { key: "edit", label: "Edit", onSelect: () => onEditPage?.({ id: page.id, slug: page.slug, title: page.title }) },
                      { key: "view", label: live ? "View live" : "Preview", onSelect: () => (live ? window.open(`/p/${page.slug}`, "_blank") : previewPage(page)) },
                      { key: "dup", label: "Duplicate", onSelect: () => duplicatePage(page.id) },
                      MENU_DIVIDER,
                      { key: "pub", label: live ? "Take offline" : "Publish", onSelect: () => togglePublish(page) },
                      { key: "rename", label: "Rename / change address", onSelect: () => setRenaming({ id: page.id, title: page.title, slug: page.slug }) },
                      MENU_DIVIDER,
                      { key: "del", label: "Delete", danger: true, onSelect: () => deletePage(page.id) },
                    ]}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {pages.length > 0 && filteredPages.length === 0 && (
        <p className="admin-sub">No pages match your filter.</p>
      )}
      {pages.length === 0 && (
        <p className="admin-sub">No pages besides Home yet. Create one above.</p>
      )}
      <ListPager page={pageNum} pageSize={DEFAULT_PAGE_SIZE} total={totalCmsPages} onPageChange={setPageNum} />

      {/* System pages: not built from blocks, so they keep their own small editors. */}
      <details className="admin-details">
        <summary>System pages: blog index, 404, error fallback</summary>
        <table className="admin-table" style={{ marginTop: 6 }}>
          <tbody>
            <tr>
              <td className="n">Blog index</td>
              <td className="m addr"><code>/blog</code></td>
              <td className="m">Header, search description, rows above and below the post list</td>
              <td className="act">
                <button type="button" className="admin-link" onClick={() => setEditingBlog(true)}>Edit</button>
                <a href="/blog" target="_blank" rel="noreferrer" className="admin-btn ghost icon" title="View live"><Eye size={13} /></a>
              </td>
            </tr>
            <tr>
              <td className="n">Not found (404)</td>
              <td className="m addr">any unknown address</td>
              <td className="m">Headline, subhead, button</td>
              <td className="act"><button type="button" className="admin-link" onClick={() => setEditingError("404")}>Edit</button></td>
            </tr>
            <tr>
              <td className="n">Something went wrong</td>
              <td className="m addr">error fallback</td>
              <td className="m">Headline, body, button labels</td>
              <td className="act"><button type="button" className="admin-link" onClick={() => setEditingError("boundary")}>Edit</button></td>
            </tr>
          </tbody>
        </table>
      </details>
    </div>
  );
};

export default PagesManager;
