import { useState, useEffect, useCallback } from "react";
import { sanitizeHtml } from "@/services/sanitize";
import { toast } from "sonner";
import { Trash2, Edit, Plus, Eye, ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { generateAiSummary, htmlToPlainText } from "@/services/aiSummary";
import SeoAssistantPanel, { type SeoApplyPayload } from "./SeoAssistantPanel";
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
import { createRedirect } from "@/services/redirects";
import ListFilters from "@/components/ui/list-filters";
import { ListPager } from "@/components/ui/list-pager";
import LeadMagnetSection from "./LeadMagnetSection";
import BlogPostBuilder from "./builder/BlogPostBuilder";
import AdminPageHeader from "./ui/AdminPageHeader";
import AdminSection from "./ui/AdminSection";
import AdminField, { adminInputClass } from "./ui/AdminField";
import AdminStickyBar from "./ui/AdminStickyBar";
import AdminStatusControl from "./ui/AdminStatusControl";
import { contentState, stateToStatus, type ContentState } from "./naming";

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
  publish_at: string | null;
  expiry_at: string | null;
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
  const [visibility, setVisibility] = useState<ContentState>("draft");
  const [blogCategories, setBlogCategories] = useState<string[]>(["Internal Communications", "Employee Experience", "General"]);
  const [form, setForm] = useState({ title: "", excerpt: "", content: "", category: "Internal Communications", status: "draft", publish_at: null as string | null, expiry_at: null as string | null, cover_image: "", cover_image_alt: "", author_name: "", author_image: "", author_image_alt: "", meta_title: "", meta_description: "", og_image: "", og_image_alt: "", tags: [] as string[], newTag: "", lead_magnet_asset_id: null as string | null, lead_magnet_cover_id: null as string | null, ai_summary: "" });

  const [generatingAiSummary, setGeneratingAiSummary] = useState(false);

  /** Ask the built-in AI connector for a 60-320 char AEO summary. */
  const handleGenerateAiSummary = async () => {
    if (generatingAiSummary) return;
    setGeneratingAiSummary(true);
    try {
      const summary = await generateAiSummary({
        title: form.title,
        content: htmlToPlainText(form.content) || form.excerpt,
        kind: "blog post",
      });
      setForm((f) => ({ ...f, ai_summary: summary }));
      toast.success("AI summary generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate summary");
    } finally {
      setGeneratingAiSummary(false);
    }
  };

  /**
   * Apply whatever the admin accepted from the "Generate all SEO"
   * review panel. Only the ticked fields arrive here.
   */
  const applySeoSuggestions = (payload: SeoApplyPayload) => {
    setForm((f) => {
      const next = { ...f };
      if (payload.meta_title) next.meta_title = payload.meta_title;
      if (payload.meta_description) next.meta_description = payload.meta_description;
      if (payload.ai_summary) next.ai_summary = payload.ai_summary;
      if (payload.tags) next.tags = Array.from(new Set([...f.tags, ...payload.tags]));
      for (const { key, alt } of payload.image_alts || []) {
        if (key === "cover") next.cover_image_alt = alt;
        if (key === "og") next.og_image_alt = alt;
        if (key === "author") next.author_image_alt = alt;
      }
      return next;
    });
  };

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
    setVisibility("draft");
    setForm({ title: "", excerpt: "", content: "", category: "Internal Communications", status: "draft", publish_at: null, expiry_at: null, cover_image: "", cover_image_alt: "", author_name: "", author_image: "", author_image_alt: "", meta_title: "", meta_description: "", og_image: "", og_image_alt: "", tags: [], newTag: "", lead_magnet_asset_id: null, lead_magnet_cover_id: null, ai_summary: "" });
  };

  const handleEdit = (post: BlogPost) => {
    setEditMode("content");
    setIsNew(false);
    setEditing(post);
    setVisibility(contentState(post.status, post.publish_at));
    setForm({
      title: post.title,
      excerpt: post.excerpt || "",
      content: post.content,
      category: post.category,
      status: post.status,
      publish_at: post.publish_at,
      expiry_at: post.expiry_at,
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

    // Slug is the public URL — only derive it from the title for a brand
    // new post. Editing an existing post keeps its slug so shared links
    // (and search rankings) stay valid.
    const slug = isNew ? generateSlug(form.title) : (editing?.slug || generateSlug(form.title));
    if (visibility === "scheduled") {
      if (!form.publish_at || new Date(form.publish_at).getTime() <= Date.now()) {
        toast.error("Choose a future date and time for this blog to go live.");
        return;
      }
      if (form.expiry_at && new Date(form.expiry_at).getTime() <= new Date(form.publish_at).getTime()) {
        toast.error("The stop date must be after the go-live date.");
        return;
      }
    }
    const payload = {
      title: form.title,
      slug,
      excerpt: form.excerpt || null,
      content: form.content,
      category: form.category,
      status,
      publish_at: visibility === "scheduled" ? form.publish_at : null,
      expiry_at: visibility === "scheduled" ? form.expiry_at : null,
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
      // Preserve the original publication date — re-saving an old post
      // must not push it to the top of the blog, and unpublishing keeps
      // the date so republishing restores it.
      published_at:
        editing?.published_at ?? (status === "published" ? new Date().toISOString() : null),
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
    // Redirects manager — capture the slug before the row is gone so a
    // published post's old URL redirects to the blog index instead of
    // 404ing.
    const target = posts.find((p) => p.id === id);
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
      action: async () => {
        const result = await deleteBlogPost(id);
        if (!result.error && target?.status === "published" && target.slug) {
          createRedirect(`/blog/${target.slug}`, "/blog", "auto");
        }
        return result;
      },
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
              className="max-w-[600px] mx-auto prose prose-sm prose-headings:font-display prose-headings:text-secondary prose-p:text-foreground/80 prose-p:leading-[1.8] prose-p:my-4 prose-a:text-primary prose-img:rounded-lg"
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
        <BlogPostBuilder
          postId={editing.id}
          onExit={() => { setEditing(null); setIsNew(false); setPreviewing(false); }}
        />
      </div>
    );
  }

  /* ── Editor Mode ── */
  if (isNew || editing) {
    const changeVisibility = (v: ContentState) => {
      setVisibility(v);
      setForm((f) => ({
        ...f,
        status: stateToStatus(v),
        publish_at: v === "scheduled" ? f.publish_at : null,
        expiry_at: v === "scheduled" ? f.expiry_at : null,
      }));
    };

    return (
      <div className="space-y-4 pb-2">
        <AdminPageHeader
          title={isNew ? "New blog" : form.title || "Edit blog"}
          description={
            isNew
              ? "Write it, then choose whether it goes live now or later."
              : `Web address: /blog/${editing?.slug || ""}`
          }
          backLabel="All blogs"
          onBack={() => { setEditing(null); setIsNew(false); setPreviewing(false); }}
          actions={
            <>
              {ModeTabs}
              <button
                onClick={openLivePreview}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-body text-xs"
                style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
                title={`Preview — Blogs: ${form.title || "Untitled"}`}
              >
                <Eye size={13} /> Preview — Blogs: {form.title ? (form.title.length > 24 ? `${form.title.slice(0, 23)}…` : form.title) : "Untitled"}
              </button>
            </>
          }
        />

        <AdminSection title="The basics" description="What readers see first on the Blogs listing.">
          <ImagePickerField
            label="Cover image"
            value={form.cover_image}
            onChange={(url) => setForm((f) => ({ ...f, cover_image: url, og_image: f.og_image || url }))}
            altValue={form.cover_image_alt}
            onAltChange={(v) => setForm((f) => ({ ...f, cover_image_alt: v }))}
          />

          <AdminField label="Title">
            <input
              placeholder="Give this blog a title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={adminInputClass}
            />
          </AdminField>

          <AdminField label="Short summary" hint="Shown on the Blogs listing page and used if no AI summary is set.">
            <input
              placeholder="One or two sentences"
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              className={adminInputClass}
            />
          </AdminField>

          <AdminField label="Category" hint="Readers can filter the Blogs page by category.">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={adminInputClass}
            >
              {blogCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </AdminField>
        </AdminSection>

        <AdminSection
          title="Article"
          description="The formatting bar stays with you as you scroll."
          action={
            <span className="font-body text-[11px] text-muted-foreground">
              {calculateReadTime(form.content)}
            </span>
          }
        >
          <RichTextEditor
            content={form.content}
            onChange={(html) => setForm({ ...form, content: html })}
            placeholder="Write your article..."
          />
        </AdminSection>

        <AdminSection title="Visibility" description="Draft, live now, or scheduled for later.">
          <AdminStatusControl
            state={visibility}
            onStateChange={changeVisibility}
            publishAt={form.publish_at}
            expiryAt={form.expiry_at}
            onPublishAtChange={(publish_at) => setForm((f) => ({ ...f, publish_at }))}
            onExpiryAtChange={(expiry_at) => setForm((f) => ({ ...f, expiry_at }))}
          />
        </AdminSection>

        <AdminSection title="Author" defaultCollapsed>
          <ImagePickerField
            label="Author photo"
            value={form.author_image}
            onChange={(url) => setForm((f) => ({ ...f, author_image: url }))}
            altValue={form.author_image_alt}
            onAltChange={(v) => setForm((f) => ({ ...f, author_image_alt: v }))}
          />
          <AdminField label="Author name">
            <input
              type="text"
              placeholder="Who wrote this?"
              value={form.author_name}
              onChange={(e) => setForm({ ...form, author_name: e.target.value })}
              className={adminInputClass}
            />
          </AdminField>
        </AdminSection>

        <AdminSection title="Tags" description="Help readers and search engines group related blogs." defaultCollapsed>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.tags.map((tag, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 font-body text-xs"
                  style={{ backgroundColor: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, tags: form.tags.filter((_, j) => j !== i) })}
                    className="hover:opacity-70"
                    aria-label={`Remove tag ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <AdminField label="Add a tag" hint="Type a tag and press Enter.">
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
              placeholder="e.g. internal comms"
              className={adminInputClass}
            />
          </AdminField>
        </AdminSection>

        <AdminSection title="Download offer" description="Optional gated file readers get in exchange for their email." defaultCollapsed>
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
        </AdminSection>

        <AdminSection
          title="Search and AI"
          description="How this blog appears in Google and in AI answers."
          defaultCollapsed
        >
          <SeoAssistantPanel
            sourceTitle={form.title}
            sourceContent={htmlToPlainText(form.content) || form.excerpt}
            kind="blog post"
            knownTags={blogCategories}
            supports={{ tags: true, images: true }}
            images={[
              ...(form.cover_image ? [{ key: "cover", context: "blog cover image", current: form.cover_image_alt }] : []),
              ...(form.og_image ? [{ key: "og", context: "social share image", current: form.og_image_alt }] : []),
              ...(form.author_image ? [{ key: "author", context: "author portrait", current: form.author_image_alt }] : []),
            ]}
            onApply={applySeoSuggestions}
          />

          <AdminField
            label="AI answer summary"
            note={`${form.ai_summary.length}/320`}
            hint="1-3 sentences written for AI assistants. Leave blank to fall back to the short summary."
          >
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleGenerateAiSummary}
                disabled={generatingAiSummary}
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-body text-[11px] hover:opacity-80 disabled:opacity-50"
                style={{ borderColor: "hsl(var(--accent) / 0.6)", color: "hsl(var(--foreground))" }}
              >
                {generatingAiSummary ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                {generatingAiSummary ? "Generating…" : "Generate with AI"}
              </button>
              <textarea
                placeholder="e.g. A practical guide to designing internal comms channels for distributed teams."
                value={form.ai_summary}
                onChange={(e) => setForm({ ...form, ai_summary: e.target.value })}
                rows={3}
                className={`${adminInputClass} resize-none`}
              />
            </div>
          </AdminField>

          <AdminField
            label="Search title"
            note={form.meta_title ? `${form.meta_title.length}/60` : undefined}
            hint="Defaults to the blog title."
          >
            <input
              placeholder="Title shown in Google results"
              value={form.meta_title}
              onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
              className={adminInputClass}
            />
          </AdminField>

          <AdminField
            label="Search description"
            note={form.meta_description ? `${form.meta_description.length}/160` : undefined}
          >
            <textarea
              placeholder="The snippet under the title in search results"
              value={form.meta_description}
              onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
              rows={2}
              className={`${adminInputClass} resize-none`}
            />
          </AdminField>

          <AdminField label="Social share image" hint="Used when the link is posted on social media.">
            <input
              placeholder="Image address"
              value={form.og_image}
              onChange={(e) => setForm({ ...form, og_image: e.target.value })}
              className={adminInputClass}
            />
          </AdminField>
          {form.og_image && (
            <ImageAltInput
              value={form.og_image_alt}
              onChange={(v) => setForm({ ...form, og_image_alt: v })}
              label="Social share image description"
            />
          )}
        </AdminSection>

        <AdminStickyBar
          status={
            visibility === "live"
              ? "Saving will publish this blog."
              : visibility === "scheduled"
                ? "Saved as a draft until the scheduled time."
                : "Saved as a draft — nobody else can see it."
          }
        >
          <SpinnerButton
            isLoading={isSavingChanges}
            loadingLabel="Saving…"
            onClick={() => handleSave(visibility === "live" ? "published" : "draft")}
            className="rounded-full px-5 py-2.5 font-body text-xs font-medium"
            style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
          >
            {visibility === "live" ? "Save & publish" : "Save"}
          </SpinnerButton>
        </AdminStickyBar>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold" style={{ color: "hsl(var(--secondary))" }}>Blogs</h2>
        <button
          onClick={handleNew}
          className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
          style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
          <Plus size={14} /> New blog
        </button>
      </div>

      {postsLoading ? (
        <ListSkeleton rows={3} rowHeight="h-20" />
      ) : posts.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground py-8 text-center">No blogs yet. Create your first one!</p>
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
