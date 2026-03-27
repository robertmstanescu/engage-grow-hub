import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, ChevronDown, ChevronUp, Eye, Send, FileText } from "lucide-react";
import { invalidateSiteContent } from "@/hooks/useSiteContent";
import HeroEditor from "./site-editor/HeroEditor";
import RowsManager from "./site-editor/RowsManager";
import SeoFields from "./site-editor/SeoFields";
import { DEFAULT_ROWS, type PageRow } from "@/types/rows";

interface SectionData {
  section_key: string;
  content: Record<string, any>;
  draft_content: Record<string, any> | null;
}

const SiteEditor = () => {
  const [sections, setSections] = useState<SectionData[]>([]);
  const [openSection, setOpenSection] = useState<string | null>("hero");
  const [saving, setSaving] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await supabase
        .from("site_content")
        .select("section_key, content, draft_content")
        .in("section_key", ["hero", "page_rows", "main_page_seo"]) as any;
      if (data) {
        const mapped = data.map((s: any) => ({
          section_key: s.section_key,
          content: s.content,
          draft_content: s.draft_content || s.content,
        }));
        setSections(mapped);
      }
    };
    fetchAll();
  }, []);

  const getSection = (key: string) => sections.find((s) => s.section_key === key);
  const getDraft = (key: string) => getSection(key)?.draft_content || getSection(key)?.content || {};

  const updateField = (sectionKey: string, field: string, value: any) => {
    setSections((prev) =>
      prev.map((s) =>
        s.section_key === sectionKey
          ? { ...s, draft_content: { ...(s.draft_content || s.content), [field]: value } }
          : s
      )
    );
  };

  const updateFullDraft = (sectionKey: string, draft: Record<string, any>) => {
    setSections((prev) =>
      prev.map((s) => (s.section_key === sectionKey ? { ...s, draft_content: draft } : s))
    );
  };

  const saveDraft = async (sectionKey: string) => {
    setSaving(sectionKey);
    const section = getSection(sectionKey);
    if (!section) { setSaving(null); return; }

    const draft = (section.draft_content || section.content) as any;
    const { data: existing } = await supabase
      .from("site_content")
      .select("id")
      .eq("section_key", sectionKey)
      .maybeSingle();

    if (existing) {
      await supabase.from("site_content").update({ draft_content: draft }).eq("section_key", sectionKey);
    } else {
      await supabase.from("site_content").insert({ section_key: sectionKey, content: draft, draft_content: draft } as any);
    }

    toast.success("Draft saved");
    setSaving(null);
  };

  const publishAll = async () => {
    setPublishing(true);
    const updates = sections.map((s) => {
      const data = (s.draft_content || s.content) as any;
      return supabase
        .from("site_content")
        .upsert({ section_key: s.section_key, content: data, draft_content: data } as any, { onConflict: "section_key" });
    });

    const results = await Promise.all(updates);
    const err = results.find((r) => r.error);
    if (err?.error) {
      toast.error((err.error as any).message);
    } else {
      setSections((prev) => prev.map((s) => ({ ...s, content: s.draft_content || s.content })));
      sections.forEach((s) => invalidateSiteContent(s.section_key));
      toast.success("All changes published!");
    }
    setPublishing(false);
  };

  const openPreview = () => {
    const saveAll = sections.map((s) =>
      supabase.from("site_content").update({ draft_content: (s.draft_content || s.content) as any }).eq("section_key", s.section_key)
    );
    Promise.all(saveAll).then(() => window.open("/?preview=1", "_blank"));
  };

  const hasChanges = sections.some((s) => JSON.stringify(s.draft_content) !== JSON.stringify(s.content));

  // Ensure page_rows and main_page_seo sections exist in state
  useEffect(() => {
    if (sections.length > 0) {
      const toAdd: any[] = [];
      if (!getSection("page_rows")) {
        toAdd.push({ section_key: "page_rows", content: { rows: DEFAULT_ROWS }, draft_content: { rows: DEFAULT_ROWS } });
      }
      if (!getSection("main_page_seo")) {
        toAdd.push({ section_key: "main_page_seo", content: { meta_title: "", meta_description: "" }, draft_content: { meta_title: "", meta_description: "" } });
      }
      if (toAdd.length) setSections((prev) => [...prev, ...toAdd]);
    }
  }, [sections.length]);

  const pageRows: PageRow[] = (getDraft("page_rows") as any)?.rows || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold" style={{ color: "hsl(var(--secondary))" }}>Edit Main Page</h2>
        <div className="flex items-center gap-2">
          <button onClick={openPreview} className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity" style={{ border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}>
            <Eye size={13} /> Preview
          </button>
          <button onClick={publishAll} disabled={publishing || !hasChanges} className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity disabled:opacity-40" style={{ backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}>
            <Send size={13} /> {publishing ? "Publishing…" : "Publish All"}
          </button>
        </div>
      </div>

      {hasChanges && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg font-body text-xs" style={{ backgroundColor: "hsl(var(--accent) / 0.15)", color: "hsl(var(--accent-foreground))" }}>
          <FileText size={13} /> You have unpublished draft changes.
        </div>
      )}

      {/* Hero section */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: "hsl(var(--border) / 0.5)", backgroundColor: "hsl(var(--card))" }}>
        <button onClick={() => setOpenSection(openSection === "hero" ? null : "hero")} className="w-full flex items-center justify-between px-4 py-3 text-left hover:opacity-80 transition-opacity" style={{ color: "hsl(var(--foreground))" }}>
          <span className="font-body text-sm font-medium">Hero Section</span>
          {openSection === "hero" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {openSection === "hero" && (
          <div className="px-4 pb-4 space-y-4">
            <HeroEditor content={getDraft("hero")} onChange={(f, v) => updateField("hero", f, v)} />
            <button onClick={() => saveDraft("hero")} disabled={saving === "hero"} className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity disabled:opacity-50" style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
              <Save size={13} /> {saving === "hero" ? "Saving…" : "Save Draft"}
            </button>
          </div>
        )}
      </div>

      {/* Page Rows */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: "hsl(var(--border) / 0.5)", backgroundColor: "hsl(var(--card))" }}>
        <button onClick={() => setOpenSection(openSection === "page_rows" ? null : "page_rows")} className="w-full flex items-center justify-between px-4 py-3 text-left hover:opacity-80 transition-opacity" style={{ color: "hsl(var(--foreground))" }}>
          <span className="font-body text-sm font-medium">Page Rows</span>
          {openSection === "page_rows" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {openSection === "page_rows" && (
          <div className="px-4 pb-4 space-y-4">
            <RowsManager rows={pageRows} onChange={(rows) => updateFullDraft("page_rows", { rows })} />
            <button onClick={() => saveDraft("page_rows")} disabled={saving === "page_rows"} className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity disabled:opacity-50" style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
              <Save size={13} /> {saving === "page_rows" ? "Saving…" : "Save Draft"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteEditor;
