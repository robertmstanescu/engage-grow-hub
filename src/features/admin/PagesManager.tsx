import { useState, useEffect } from "react";
import { Plus, Trash2, ExternalLink, Globe, FileText, Save, Eye, Home } from "lucide-react";
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
  updateCmsPageMeta, RESERVED_SLUGS,
} from "@/services/cmsPages";
import { fetchSection, publishSection } from "@/services/siteContent";
import { useListFilters } from "@/hooks/useListFilters";
import ListFilters from "@/components/ui/list-filters";

interface CmsPage {
  id: string;
  slug: string;
  title: string;
  template_type: string;
  page_rows: PageRow[];
  draft_page_rows: PageRow[] | null;
  status: string;
  created_at: string;
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
}

const PagesManager = ({ onEditPage }: Props) => {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<CmsPage | null>(null);
  const [editingBlog, setEditingBlog] = useState(false);
  const [blogContent, setBlogContent] = useState<{ rows_above: PageRow[]; rows_below: PageRow[]; header_title: string; header_subtitle: string; meta_title: string; meta_description: string }>({
    rows_above: [], rows_below: [], header_title: "Insights & Articles", header_subtitle: "Sharp thinking on internal communications, employee experience, and the culture vampires lurking in your organisation.", meta_title: "", meta_description: "",
  });
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [isCreatingPage, setIsCreatingPage] = useState(false);

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

  useEffect(() => { load(); loadBlogPage(); }, []);

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

  const saveBlogPage = (updates: Partial<typeof blogContent>) => {
    const next = { ...blogContent, ...updates };
    setBlogContent(next);
    return runDbAction({
      action: () => publishSection("blog_page", next),
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
        />

        {/* AI Search Summary — fed to /llms.txt for AI assistants. */}
        <div
          className="rounded-lg border p-4 space-y-2"
          style={{ borderColor: "hsl(46 75% 40% / 0.4)", backgroundColor: "hsl(46 75% 60% / 0.06)" }}
        >
          <label
            className="font-body text-[10px] uppercase tracking-wider font-medium block"
            style={{ color: "hsl(var(--foreground))" }}
          >
            AI Search Summary
          </label>
          <p className="font-body text-[11px]" style={{ color: "hsl(var(--muted-foreground))" }}>
            A 1-3 sentence summary written for AI assistants (ChatGPT, Claude, Perplexity). Aim for 60-320 characters.
          </p>
          <textarea
            placeholder="Describe this page in plain language for AI crawlers."
            value={editingPage.ai_summary || ""}
            onChange={(e) => {
              const value = e.target.value;
              setEditingPage({ ...editingPage, ai_summary: value });
            }}
            onBlur={async (e) => {
              const value = e.target.value.trim();
              await updateCmsPageMeta(editingPage.id, "ai_summary", value);
              if (value) {
                toast.success("AEO Metadata Synchronized: Content is now ready for AI Crawlers.");
              }
            }}
            rows={3}
            className="w-full px-4 py-2.5 rounded-lg font-body text-sm border resize-none"
            style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
          />
          <p className="font-body text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
            {(editingPage.ai_summary || "").length}/320 chars
          </p>
        </div>
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
      </div>

      {/* CMS Pages */}
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
