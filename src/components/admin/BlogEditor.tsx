import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeHtml } from "@/lib/sanitize";
import { toast } from "sonner";
import { Trash2, Edit, Plus, Eye, ArrowLeft, Upload } from "lucide-react";
import RichTextEditor from "./RichTextEditor";

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
  author_name: string | null;
  author_image: string | null;
}

const BlogEditor = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [blogCategories, setBlogCategories] = useState<string[]>(["Internal Communications", "Employee Experience", "General"]);
  const [form, setForm] = useState({ title: "", excerpt: "", content: "", category: "Internal Communications", status: "draft", cover_image: "", author_name: "", author_image: "" });
  const authorInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadCategories = async () => {
      const { data } = await supabase
        .from("site_content")
        .select("content")
        .eq("section_key", "tags_config")
        .maybeSingle() as any;
      if (data?.content?.blog_categories) {
        const cats = data.content.blog_categories;
        // Support both old string[] and new object[] formats
        setBlogCategories(cats.map((c: any) => typeof c === "string" ? c : c.label));
      }
    };
    loadCategories();
  }, []);

  const fetchPosts = async () => {
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setPosts(data as BlogPost[]);
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleNew = () => {
    setIsNew(true);
    setEditing(null);
    setForm({ title: "", excerpt: "", content: "", category: "Internal Communications", status: "draft", cover_image: "" });
  };

  const handleEdit = (post: BlogPost) => {
    setIsNew(false);
    setEditing(post);
    setForm({
      title: post.title,
      excerpt: post.excerpt || "",
      content: post.content,
      category: post.category,
      status: post.status,
      cover_image: post.cover_image || "",
    });
  };

  const handleCoverUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }

    const ext = file.name.split(".").pop();
    const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("editor-images").upload(path, file);
    if (error) { toast.error("Upload failed"); return; }

    const { data: { publicUrl } } = supabase.storage.from("editor-images").getPublicUrl(path);
    setForm((f) => ({ ...f, cover_image: publicUrl }));
    toast.success("Cover image uploaded");
  }, []);

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
      published_at: status === "published" ? new Date().toISOString() : null,
    };

    if (isNew) {
      const { error } = await supabase.from("blog_posts").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Post created");
    } else if (editing) {
      const { error } = await supabase.from("blog_posts").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Post updated");
    }

    setEditing(null);
    setIsNew(false);
    fetchPosts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    await supabase.from("blog_posts").delete().eq("id", id);
    toast.success("Post deleted");
    fetchPosts();
  };

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
            <div className="relative h-48 md:h-64 overflow-hidden">
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
              className="max-w-[600px] mx-auto prose prose-sm prose-headings:font-display prose-headings:text-secondary prose-p:text-foreground/80 prose-p:leading-[1.8] prose-a:text-primary prose-img:rounded-lg"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(form.content || "<p>No content yet.</p>") }}
            />
          </div>
        </div>
      </div>
    );
  }

  /* ── Editor Mode ── */
  if (isNew || editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold" style={{ color: "hsl(var(--secondary))" }}>
            {isNew ? "New Post" : "Edit Post"}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewing(true)}
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
        <div>
          <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">Cover Image</label>
          {form.cover_image ? (
            <div className="relative rounded-lg overflow-hidden border" style={{ borderColor: "hsl(var(--border))" }}>
              <img src={form.cover_image} alt="" className="w-full h-40 object-cover" />
              <div className="absolute bottom-2 right-2 flex gap-1.5">
                <button
                  onClick={() => coverInputRef.current?.click()}
                  className="font-body text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full backdrop-blur-sm hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: "hsl(var(--card) / 0.9)", color: "hsl(var(--foreground))" }}>
                  Replace
                </button>
                <button
                  onClick={() => setForm({ ...form, cover_image: "" })}
                  className="font-body text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full backdrop-blur-sm hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: "hsl(var(--destructive) / 0.9)", color: "hsl(var(--destructive-foreground))" }}>
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => coverInputRef.current?.click()}
              className="w-full py-8 rounded-lg border-2 border-dashed flex flex-col items-center gap-2 hover:opacity-70 transition-opacity"
              style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
              <Upload size={20} />
              <span className="font-body text-xs">Upload cover image</span>
            </button>
          )}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleCoverUpload(file);
              e.target.value = "";
            }}
          />
        </div>

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

        <div className="flex gap-3">
          <button
            onClick={() => handleSave("draft")}
            className="font-body text-xs uppercase tracking-wider px-5 py-2.5 rounded-full border hover:opacity-80 transition-opacity"
            style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}>
            Save as Draft
          </button>
          <button
            onClick={() => handleSave("published")}
            className="font-body text-xs uppercase tracking-wider px-5 py-2.5 rounded-full hover:opacity-80 transition-opacity"
            style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
            Publish
          </button>
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

      {posts.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground py-8 text-center">No posts yet. Create your first one!</p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
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
        </div>
      )}
    </div>
  );
};

export default BlogEditor;
