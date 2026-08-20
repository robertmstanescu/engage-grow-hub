import { useState, useEffect, useCallback } from "react";
import { sanitizeHtml } from "@/services/sanitize";
import { toast } from "sonner";
import { Trash2, Edit, Plus, Eye, ArrowLeft } from "lucide-react";
import RichTextEditor from "./RichTextEditor";
import { patchLivePreviewState } from "@/services/livePreview";
import ImageAltInput from "./ImageAltInput";
import ImagePickerField from "./ImagePickerField";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { SpinnerButton } from "@/components/ui/spinner-button";
import { runDbAction, runOptimisticAction } from "@/services/db-helpers";
import { fetchAllBlogPosts, insertBlogPost, updateBlogPost, deleteBlogPost } from "@/services/blogPosts";
import { DEFAULT_PAGE_SIZE } from "@/services/pagination";
import { fetchSection } from "@/services/siteContent";
import { useListFilters } from "@/hooks/useListFilters";
import ListFilters from "@/components/ui/list-filters";
import { ListPager } from "@/components/ui/list-pager";
import LeadMagnetSection from "./LeadMagnetSection";
import BlogPostBuilder from "./builder/BlogPostBuilder";

const generateSlug = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const calculateReadTime = (html: string) => {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const words = text.split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
};

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string;
  status: string;
  published_at: string | null;
  created_at: string;
  cover_image: string | null;
  cover_image_alt: string | null;
  author_name: string | null;
  author_image: string | null;
  author_image_alt: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  og_image_alt: string | null;
  tags: string[] | null;
  lead_magnet_asset_id: string | null;
  lead_magnet_cover_id: string | null;
  ai_summary: string | null;
}

const BlogEditor = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [editMode, setEditMode] = useState<"content" | "structure">("content");
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [blogCategories, setBlogCategories] = useState<string[]>(["Internal Communications", "Employee Experience", "General"]);
  const [form, setForm] = useState({ title: "", excerpt: "", content: "", category: "Internal Communications", status: "draft", cover_image: "", cover_image_alt: "", author_name: "", author_image: "", author_image_alt: "", meta_title: "", meta_description: "", og_image: "", og_image_alt: "", tags: [] as string[], newTag: "", lead_magnet_asset_id: null as string | null, lead_magnet_cover_id: null as string | null, ai_summary: "" });

  useEffect(() => {
    const loadCategories = async () => {
      const { data } = await fetchSection("tags_config");
      const cats = (data?.content as any)?.blog_categories;
      if (cats) {
        // Support both old string[] and new object[] formats
        setBlogCategories(cats.map((c: any) => typeof c === "string" ? c : c.label));
      }
    };
    loadCategories();
  }, []);

  const fetchPosts = async () => {
    setPostsLoading(true);
    const { data, count } = await fetchAllBlogPosts(page, DEFAULT_PAGE_SIZE);
    if (data) setPosts(data as BlogPost[]);
    if (typeof count === "number") setTotalPosts(count);
    setPostsLoading(false);
  };

  useEffect(() => { fetchPosts(); }, [page]);

  const handleNew = () => {
    setIsNew(true);
    setEditing(null);
    setForm({ title: "", excerpt: "", content: "", category: "Internal Communications", status: "draft", cover_image: "", cover_image_alt: "", author_name: "", author_image: "", author_image_alt: "", meta_title: "", meta_description: "", og_image: "", og_image_alt: "", tags: [], newTag: "", lead_magnet_asset_id: null, lead_magnet_cover_id: null, ai_summary: "" });
  };

  const handleEdit = (post: BlogPost) => {
    setEditMode("content");
    setIsNew(false);
    setEditing(post);
    setForm({
      title: post.title,
      excerpt: post.excerpt || "",
      content: post.content,
      category: post.category,
      status: post.status,
      cover_image: post.cover_image || "",
      cover_image_alt: post.cover_image_alt || "",
      author_name: post.author_name || "",
      author_image: post.author_image || "",
      author_image_alt: post.author_image_alt || "",
      meta_title: post.meta_title || "",
      meta_description: post.meta_description || "",
      og_image: post.og_image || post.cover_image || "",
      og_image_alt: post.og_image_alt || "",
      tags: post.tags || [],
      newTag: "",
      lead_magnet_asset_id: post.lead_magnet_asset_id ?? null,
      lead_magnet_cover_id: post.lead_magnet_cover_id ?? null,
      ai_summary: post.ai_summary || "",
    });
  };


  const handleSave = async (status: string) => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }

    const slug = generateSlug(form.title);
    const payload = {
      title: form.title,
      slug,
      excerpt: form.excerpt || null,
      content: form.content,
      category: form.category,
      status,
      cover_image: form.cover_image || null,
      cover_image_alt: form.cover_image_alt?.trim() || null,
      author_name: form.author_name || null,
      author_image: form.author_image || null,
      author_image_alt: form.author_image_alt?.trim() || null,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
      og_image: form.og_image || null,
      og_image_alt: form.og_image_alt?.trim() || null,
      tags: form.tags.length > 0 ? form.tags : null,
      published_at: status === "published" ? new Date().toISOString() : null,
      lead_magnet_asset_id: form.lead_magnet_asset_id,
      lead_magnet_cover_id: form.lead_magnet_cover_id,
      ai_summary: form.ai_summary?.trim() || null,
    };

    const result = await runDbAction({
      action: () => isNew ? insertBlogPost(payload) : updateBlogPost(editing!.id, payload),
      setLoading: setIsSavingChanges,
      successMessage: isNew ? "Post created" : "Post updated",
    });

    // AEO sync confirmation — let the admin know the manifest will pick it up.
    if (result !== null && form.ai_summary?.trim()) {
      toast.success("AEO Metadata Synchronized: Content is now ready for AI Crawlers.");
    }

    if (result !== null) {
      setEditing(null);
      setIsNew(false);
      // New posts sort to page 1 (newest first) — jump there so it's visible.
      if (isNew && page !== 1) setPage(1);
      else fetchPosts();
    }
  };

  /** Optimistic delete — see db-helpers.ts for rationale. */
  const handleDelete = (id: string) => {
    if (!confirm("Delete this post?")) return;
    return runOptimisticAction({
      snapshot: () => posts,
      applyOptimistic: () => {
        setPosts((p) => p.filter((x) => x.id !== id));
        setTotalPosts((prev) => Math.max(0, prev - 1));
      },
      rollback: (prev) => {
        setPosts(prev);
        setTotalPosts((prev) => prev + 1);
      },
      action: () => deleteBlogPost(id),
      successMessage: "Post deleted",
    });
  };

  const buildLivePreviewPost = useCallback(() => {
    const previewSlug = generateSlug(form.title || editing?.slug || "draft-post");
    return {
      key: editing?.id || previewSlug,
      slug: previewSlug,
      title: form.title || "Untitled Post",
      published_at: new Date().toISOString(),
      content: form.content || "<p>No content yet.</p>",
      category: form.category,
      cover_image: form.cover_image || null,
      author_name: form.author_name || null,
      author_image: form.author_image || null,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
      og_image: form.og_image || null,
      tags: form.tags.length > 0 ? form.tags : null,
    };
  }, [form, editing]);

  useEffect(() => {
    if (!isNew && !editing) return;
    const preview = buildLivePreviewPost();
    patchLivePreviewState({ blogPosts: { [preview.key]: preview, [preview.slug]: preview } });
  }, [buildLivePreviewPost, editing, isNew]);

  const openLivePreview = useCallback(() => {
    const preview = buildLivePreviewPost();
    patchLivePreviewState({ blogPosts: { [preview.key]: preview, [preview.slug]: preview } });
    window.open(`/blog/${preview.slug}?preview=draft&previewKey=${encodeURIComponent(preview.key)}`, "_blank");
  }, [buildLivePreviewPost]);

  // ── Search / filter / sort over the post list ──
  // Searches title + category + status. Type filter dropdown surfaces the
  // post categories present in the data. URL params: ?bq, ?btype, ?bsort.
  const blogFilters = useListFilters<BlogPost>({
    items: posts,
    paramPrefix: "b",
    defaultSort: "manual",
    searchableText: (p) =>
      `${p.title} ${p.category || ""} ${p.status || ""} ${p.excerpt || ""}`.toLowerCase(),
    categoryOf: (p) => p.category,
    alphaKey: (p) => p.title.toLowerCase(),
    updatedKey: (p) => p.published_at || p.created_at,
  });
  const filteredPosts = blogFilters.filteredItems;

  /* ── Preview Mode ── */
  if (previewing && (isNew || editing)) {
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    };

    return (
      <div className="space-y-0">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setPreviewing(false)}
            className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider text-muted-foreground hover:opacity-70">
            <ArrowLeft size={14} /> Back to editor
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => { setPreviewing(false); handleSave("draft"); }}
              className="font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full border hover:opacity-80 transition-opacity"
              style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}>
              Save Draft
            </button>
            <button
              onClick={() => { setPreviewing(false); handleSave("published"); }}
              className="font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
              style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
              Publish
            </button>
          </div>
        </div>

        <div className="rounded-lg overflow-hidden border" style={{ borderColor: "hsl(var(--border))" }}>
          {form.cover_image && (
            <div className="relative w-full overflow-hidden aspect-video max-h-[70vh]">
              <img src={form.cover_image} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, hsl(var(--primary)))" }} />
            </div>
          )}
          <header className={`${form.cover_image ? "pt-4" : "pt-10"} pb-8 px-6`} style={{ backgroundColor: "hsl(var(--primary))" }}>
            <div className="max-w-[600px] mx-auto">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className="font-body text-[10px] tracking-[0.18em] uppercase px-2.5 py-1 rounded-full font-medium"
                  style={{ backgroundColor: "hsl(var(--accent) / 0.2)", color: "hsl(var(--accent))" }}>
                  {form.category}
                </span>
                <span className="font-body text-xs" style={{ color: "hsl(var(--primary-foreground) / 0.5)" }}>
                  {formatDate(new Date().toISOString())} · {calculateReadTime(form.content)}
                </span>
              </div>
              <h1
                className="font-display text-xl md:text-2xl font-black leading-tight"
                style={{ color: "hsl(var(--primary-foreground))" }}>
                {form.title || "Untitled Post"}
              </h1>
              {form.excerpt && (
                <p className="mt-2 font-body text-sm" style={{ color: "hsl(var(--primary-foreground) / 0.7)" }}>
                  {form.excerpt}
                </p>
              )}
            </div>
          </header>

          <div className="py-8 px-6" style={{ backgroundColor: "hsl(var(--background))" }}>
            <div
              className="max-w-[600px] mx-auto prose prose-sm prose-headings:font-display prose-headings:text-secondary prose-p:text-foreground/80 prose-p:leading-[1.8] prose-p:my-2 prose-a:text-primary prose-img:rounded-lg"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(form.content || "<p>No content yet.</p>") }}
            />
          </div>
        </div>
      </div>
    );
  }

  /* ── Mode switcher for existing posts ──
     "content"   → metadata + rich-text article editor (default)
     "structure" → visual widget/page-structure builder */
  const ModeTabs = editing && !isNew ? (
    <div className="inline-flex rounded-full border p-0.5" style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--muted) / 0.3)" }}>
      {([
        { id: "content", label: "Content & Metadata" },
        { id: "structure", label: "Page Structure" },
      ] as const).map((t) => (
        <button
          key={t.id}
          onClick={() => setEditMode(t.id)}
          className="font-body text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full transition-opacity"
          style={
            editMode === t.id
              ? { backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }
              : { color: "hsl(var(--muted-foreground))" }
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  ) : null;

  if (editing && !isNew && editMode === "structure") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-display text-lg font-bold" style={{ color: "hsl(var(--secondary))" }}>
            Edit Post · {editing.title}
          </h2>
          <div className="flex items-center gap-2">
            {ModeTabs}
            <button
              onClick={() => { setEditing(null); setIsNew(false); setPreviewing(false); }}
              className="font-body text-xs text-muted-foreground hover:opacity-70"
            >
              ← Back to posts
            </button>
          </div>
        </div>
        <BlogPostBuilder postId={editing.id} />
      </div>
    );
  }

  /* ── Editor Mode ── */
  if (isNew || editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-display text-lg font-bold" style={{ color: "hsl(var(--secondary))" }}>
            {isNew ? "New Post" : "Edit Post"}
          </h2>
          <div className="flex items-center gap-2">
            {ModeTabs}
            <button
              onClick={openLivePreview}
              className="flex items-center gap-1 font-body text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border hover:opacity-80 transition-opacity"
              style={{ borderColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))", backgroundColor: "hsl(var(--accent) / 0.1)" }}>
              <Eye size={13} /> Preview
            </button>
            <button onClick={() => { setEditing(null); setIsNew(false); setPreviewing(false); }} className="font-body text-xs text-muted-foreground hover:opacity-70">
              Cancel
            </button>
          </div>
        </div>

        {/* Cover image */}
        <ImagePickerField
          label="Cover Image"
          value={form.cover_image}
          onChange={(url) => setForm((f) => ({ ...f, cover_image: url, og_image: f.og_image || url }))}
          altValue={form.cover_image_alt}
          onAltChange={(v) => setForm((f) => ({ ...f, cover_image_alt: v }))}
        />

        <input
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full px-4 py-3 rounded-lg font-body text-sm border"
          style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}
        />
        <input
          placeholder="Excerpt (short summary for listing page)"
          value={form.excerpt}
          onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
          className="w-full px-4 py-3 rounded-lg font-body text-sm border"
          style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}
        />
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="w-full px-4 py-3 rounded-lg font-body text-sm border"
          style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}>
          {blogCategories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <div>
          <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">Article Content</label>
          <RichTextEditor
            content={form.content}
            onChange={(html) => setForm({ ...form, content: html })}
            placeholder="Write your article..."
          />
        </div>

        <p className="font-body text-xs text-muted-foreground">
          Estimated read time: {calculateReadTime(form.content)}
        </p>

        {/* Author */}
        <div className="flex items-end gap-3">
          <div className="flex-1 min-w-0">
            <ImagePickerField
              label="Author Image"
              value={form.author_image}
              onChange={(url) => setForm((f) => ({ ...f, author_image: url }))}
              altValue={form.author_image_alt}
              onAltChange={(v) => setForm((f) => ({ ...f, author_image_alt: v }))}
            />
          </div>
          <input
            type="text"
            placeholder="Author name"
            value={form.author_name}
            onChange={(e) => setForm({ ...form, author_name: e.target.value })}
            className="flex-1 px-4 py-3 rounded-lg font-body text-sm border"
            style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}
          />
        </div>

        {/* Tags */}
        <div>
          <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">Tags</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.tags.map((tag, i) => (
              <span key={i} className="flex items-center gap-1 font-body text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>
                {tag}
                <button type="button" onClick={() => setForm({ ...form, tags: form.tags.filter((_, j) => j !== i) })} className="hover:opacity-70">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input
              value={form.newTag}
              onChange={(e) => setForm({ ...form, newTag: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && form.newTag.trim()) {
                  e.preventDefault();
                  if (!form.tags.includes(form.newTag.trim())) {
                    setForm({ ...form, tags: [...form.tags, form.newTag.trim()], newTag: "" });
                  }
                }
              }}
              placeholder="Add tag + Enter"
              className="flex-1 px-3 py-2 rounded-lg font-body text-sm border"
              style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}
            />
          </div>
        </div>

        {/* Lead magnet (gated download) */}
        <LeadMagnetSection
          resourceAssetId={form.lead_magnet_asset_id}
          coverAssetId={form.lead_magnet_cover_id}
          onChange={({ resource_asset_id, cover_asset_id }) =>
            setForm((f) => ({
              ...f,
              lead_magnet_asset_id: resource_asset_id,
              lead_magnet_cover_id: cover_asset_id,
            }))
          }
        />

        {/* AI Search Summary — feeds /llms.txt and /llms-full.txt */}
        <div className="rounded-lg border p-4 space-y-2" style={{ borderColor: "hsl(var(--accent) / 0.4)", backgroundColor: "hsl(var(--accent) / 0.05)" }}>
          <label className="font-body text-[10px] uppercase tracking-wider font-medium block" style={{ color: "hsl(var(--foreground))" }}>
            AI Search Summary
          </label>
          <p className="font-body text-[11px]" style={{ color: "hsl(var(--muted-foreground))" }}>
            A 1-3 sentence summary written for AI assistants (ChatGPT, Claude, Perplexity). Aim for 60-320 characters. Leave blank to fall back to the excerpt.
          </p>
          <textarea
            placeholder="e.g. A practical guide to designing internal comms channels for distributed teams, with concrete examples from the consulting practice."
            value={form.ai_summary}
            onChange={(e) => setForm({ ...form, ai_summary: e.target.value })}
            rows={3}
            className="w-full px-4 py-2.5 rounded-lg font-body text-sm border resize-none"
            style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
          />
          <p className="font-body text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
            {form.ai_summary.length}/320 chars
          </p>
        </div>
        {/* SEO & Metadata */}
        <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: "hsl(var(--border) / 0.5)", backgroundColor: "hsl(var(--muted) / 0.2)" }}>
          <label className="font-body text-[10px] uppercase tracking-wider font-medium block" style={{ color: "hsl(var(--foreground))" }}>SEO & Metadata</label>
          <input
            placeholder="Meta Title (defaults to post title)"
            value={form.meta_title}
            onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg font-body text-sm border"
            style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
          />
          <textarea
            placeholder="Meta Description (for search engines & social sharing)"
            value={form.meta_description}
            onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
            rows={2}
            className="w-full px-4 py-2.5 rounded-lg font-body text-sm border resize-none"
            style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
          />
          <input
            placeholder="OG Image URL (for social sharing previews)"
            value={form.og_image}
            onChange={(e) => setForm({ ...form, og_image: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg font-body text-sm border"
            style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
          />
          {form.og_image && (
            <ImageAltInput
              value={form.og_image_alt}
              onChange={(v) => setForm({ ...form, og_image_alt: v })}
              label="OG Image Alt Text (SEO)"
            />
          )}
          {form.meta_title && <p className="font-body text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>Title: {form.meta_title.length}/60 chars</p>}
          {form.meta_description && <p className="font-body text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>Description: {form.meta_description.length}/160 chars</p>}
        </div>
        <div className="flex gap-3">
          <SpinnerButton
            isLoading={isSavingChanges}
            loadingLabel="Saving…"
            onClick={() => handleSave("draft")}
            className="font-body text-xs uppercase tracking-wider px-5 py-2.5 rounded-full border hover:opacity-80 transition-opacity"
            style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}>
            Save as Draft
          </SpinnerButton>
          <SpinnerButton
            isLoading={isSavingChanges}
            loadingLabel="Publishing…"
            onClick={() => handleSave("published")}
            className="font-body text-xs uppercase tracking-wider px-5 py-2.5 rounded-full hover:opacity-80 transition-opacity"
            style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
            Publish
          </SpinnerButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold" style={{ color: "hsl(var(--secondary))" }}>Blog Posts</h2>
        <button
          onClick={handleNew}
          className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
          style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
          <Plus size={14} /> New Post
        </button>
      </div>

      {postsLoading ? (
        <ListSkeleton rows={3} rowHeight="h-20" />
      ) : posts.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground py-8 text-center">No posts yet. Create your first one!</p>
      ) : (
        <div className="space-y-3">
          {posts.length > 1 && (
            <ListFilters state={blogFilters.state} searchPlaceholder="Search posts…" />
          )}
          {filteredPosts.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground py-6 text-center">No posts match your filters.</p>
          ) : filteredPosts.map((post) => (
            <div
              key={post.id}
              className="flex items-center justify-between p-4 rounded-lg border"
              style={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border) / 0.5)" }}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {post.cover_image && (
                  <img src={post.cover_image} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="font-body text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: post.status === "published" ? "hsl(var(--accent) / 0.15)" : "hsl(var(--muted))",
                        color: post.status === "published" ? "hsl(var(--accent-foreground))" : "hsl(var(--muted-foreground))",
                      }}>
                      {post.status}
                    </span>
                    <span className="font-body text-[10px] text-muted-foreground">{post.category}</span>
                  </div>
                  <p className="font-body text-sm font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>{post.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button onClick={() => handleEdit(post)} className="p-2 hover:opacity-70" style={{ color: "hsl(var(--muted-foreground))" }}>
                  <Edit size={15} />
                </button>
                <button onClick={() => handleDelete(post.id)} className="p-2 hover:opacity-70" style={{ color: "hsl(var(--destructive))" }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
          <ListPager page={page} pageSize={DEFAULT_PAGE_SIZE} total={totalPosts} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
};

export default BlogEditor;
