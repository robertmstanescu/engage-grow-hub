import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink, Globe, FileText } from "lucide-react";
import RowsManager from "./site-editor/RowsManager";
import { SectionBox, Field } from "./site-editor/FieldComponents";
import type { PageRow } from "@/types/rows";

interface CmsPage {
  id: string;
  slug: string;
  title: string;
  template_type: string;
  page_rows: PageRow[];
  draft_page_rows: PageRow[] | null;
  status: string;
  created_at: string;
}

const PagesManager = () => {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<CmsPage | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("cms_pages")
      .select("*")
      .order("created_at", { ascending: false }) as any;
    setPages(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const RESERVED_SLUGS = ["admin", "blog", "unsubscribe", "api", "auth", "login", "signup", "p"];

  const createPage = async () => {
    if (!newTitle.trim()) { toast.error("Title required"); return; }
    const slug = newSlug.trim() || slugify(newTitle);

    if (RESERVED_SLUGS.includes(slug)) {
      toast.error(`"${slug}" is a reserved system route. Choose a different slug.`);
      return;
    }

    const { error } = await supabase.from("cms_pages").insert({
      title: newTitle.trim(),
      slug,
      template_type: "blank",
      page_rows: [],
      status: "draft",
    } as any);

    if (error) {
      toast.error(error.message.includes("duplicate") ? "That slug is already taken" : error.message);
      return;
    }

    toast.success("Page created");
    setNewTitle("");
    setNewSlug("");
    setShowCreate(false);
    load();
  };

  const deletePage = async (id: string) => {
    if (!confirm("Delete this page permanently?")) return;
    await supabase.from("cms_pages").delete().eq("id", id);
    toast.success("Deleted");
    if (editingPage?.id === id) setEditingPage(null);
    load();
  };

  const savePageRows = async (page: CmsPage, rows: PageRow[]) => {
    const { error } = await supabase
      .from("cms_pages")
      .update({ page_rows: rows as any, draft_page_rows: rows as any } as any)
      .eq("id", page.id);
    if (error) { toast.error("Save failed"); return; }
    toast.success("Saved");
    setEditingPage({ ...page, page_rows: rows });
    load();
  };

  const togglePublish = async (page: CmsPage) => {
    const newStatus = page.status === "published" ? "draft" : "published";
    await supabase.from("cms_pages").update({ status: newStatus } as any).eq("id", page.id);
    toast.success(newStatus === "published" ? "Published!" : "Unpublished");
    if (editingPage?.id === page.id) setEditingPage({ ...page, status: newStatus });
    load();
  };

  if (loading) return <div className="py-8 text-center font-body text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Loading…</div>;

  if (editingPage) {
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
              onClick={() => togglePublish(editingPage)}
              className="font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
              style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
              {editingPage.status === "published" ? "Unpublish" : "Publish"}
            </button>
          </div>
        </div>
        <h2 className="font-display text-lg font-bold" style={{ color: "hsl(var(--foreground))" }}>
          {editingPage.title}
          <span className="font-body text-xs font-normal ml-2" style={{ color: "hsl(var(--muted-foreground))" }}>/{editingPage.slug}</span>
        </h2>
        <RowsManager
          rows={editingPage.page_rows || []}
          onChange={(rows) => savePageRows(editingPage, rows)}
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
        {[
          { title: "Blog", slug: "blog", href: "/blog" },
        ].map((sp) => (
          <div
            key={sp.slug}
            className="flex items-center justify-between p-3 rounded-lg border"
            style={{ borderColor: "hsl(var(--border) / 0.5)", backgroundColor: "hsl(var(--card))" }}>
            <div className="flex items-center gap-3">
              <Globe size={16} style={{ color: "hsl(var(--muted-foreground))" }} />
              <div>
                <span className="font-body text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>{sp.title}</span>
                <span className="font-body text-xs ml-2" style={{ color: "hsl(var(--muted-foreground))" }}>/{sp.slug}</span>
              </div>
              <span className="font-body text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">system</span>
            </div>
            <a href={sp.href} target="_blank" className="p-2 rounded hover:opacity-70" style={{ color: "hsl(var(--muted-foreground))" }}>
              <ExternalLink size={14} />
            </a>
          </div>
        ))}
      </div>

      {/* CMS Pages */}
      {pages.length === 0 ? (
        <div className="py-12 text-center font-body text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          No custom pages yet. Create your first page above.
        </div>
      ) : (
        <div className="space-y-2">
          <label className="font-body text-[10px] uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Custom Pages</label>
          {pages.map((page) => (
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
                  onClick={() => setEditingPage(page)}
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
