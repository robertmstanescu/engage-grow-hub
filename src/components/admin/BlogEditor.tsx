import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Edit, Plus, Eye, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
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
}

const BlogEditor = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [form, setForm] = useState({ title: "", excerpt: "", content: "", category: "Internal Communications", status: "draft" });

  const fetchPosts = async () => {
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setPosts(data);
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleNew = () => {
    setIsNew(true);
    setEditing(null);
    setForm({ title: "", excerpt: "", content: "", category: "Internal Communications", status: "draft" });
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

  if (isNew || editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold" style={{ color: "hsl(var(--secondary))" }}>
            {isNew ? "New Post" : "Edit Post"}
          </h2>
          <button onClick={() => { setEditing(null); setIsNew(false); }} className="font-body text-xs text-muted-foreground hover:opacity-70">
            Cancel
          </button>
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
          <option>Internal Communications</option>
          <option>Employee Experience</option>
          <option>General</option>
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
              <div className="flex-1 min-w-0">
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
